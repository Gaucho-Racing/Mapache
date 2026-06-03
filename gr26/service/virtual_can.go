package service

import (
	"encoding/binary"
	"net"
	"strconv"

	"github.com/gaucho-racing/mapache/gr26/config"
	"github.com/gaucho-racing/mapache/gr26/pkg/logger"
)

// nodeIDMap mirrors the table in tcm-mqtt; canID byte -> node name string,
// which feeds the gr26 topic/path convention. Kept in sync manually for now;
// if it drifts, virtual CAN frames will land under "unknown".
var nodeIDMap = map[byte]string{
	0x00: "all",
	0x01: "debugger",
	0x02: "ecu",
	0x03: "bcu",
	0x04: "tcm",
	0x05: "dash_panel",
	0x08: "gr_inverter",
	0x0C: "charging_sdc",
	0x0D: "fan_controller_1",
	0x0E: "fan_controller_2",
	0x0F: "fan_controller_3",
	0x10: "tire_temp_fl",
	0x11: "tire_temp_fr",
	0x12: "tire_temp_rl",
	0x13: "tire_temp_rr",
	0x14: "suspension_fl",
	0x15: "suspension_fr",
	0x16: "suspension_rl",
	0x17: "suspension_rr",
	0x18: "inboard_floor_fl",
	0x19: "inboard_floor_fr",
	0x1A: "inboard_floor_rl",
	0x1B: "inboard_floor_rr",
	0x1C: "brake_temp_fl",
	0x1D: "brake_temp_fr",
	0x1E: "brake_temp_rl",
	0x1F: "brake_temp_rr",
	0x30: "dgps",
	0x67: "dti",
}

// StartVirtualCANListeners spawns one goroutine per configured port. Each
// listener accepts UDP packets in the virtual CAN wire format and dispatches
// them through the same HandleMessage path as MQTT-delivered frames.
func StartVirtualCANListeners() {
	if len(config.VirtualCANPorts) == 0 {
		logger.SugarLogger.Infoln("[VCAN] no virtual CAN ports configured")
		return
	}
	for _, port := range config.VirtualCANPorts {
		go listenVirtualCAN(port)
	}
}

// listenVirtualCAN reads from one UDP port forever, parsing the virtual CAN
// wire format:
//
//	[0:4]    canID         u32 LE
//	[4]      bus           u8   (unused, 0xFF for virtual)
//	[5]      length        u8   (payload byte count)
//	[6:14]   timestamp     u64 BE (μs since epoch)
//	[14:16]  upload_key    u16 BE
//	[16:16+length] payload
//
// The slice [6:16+length] is exactly the shape HandleMessage already consumes
// from MQTT (timestamp || key || data), so we hand it through directly.
func listenVirtualCAN(port string) {
	portInt, err := strconv.Atoi(port)
	if err != nil {
		logger.SugarLogger.Fatalf("[VCAN] invalid port %q: %v", port, err)
	}
	addr := net.UDPAddr{Port: portInt, IP: net.ParseIP("0.0.0.0")}
	conn, err := net.ListenUDP("udp", &addr)
	if err != nil {
		logger.SugarLogger.Fatalf("[VCAN] failed to bind UDP port %s: %v", port, err)
	}
	defer conn.Close()
	logger.SugarLogger.Infof("[VCAN] listening on udp/%s", port)

	buffer := make([]byte, 1024)
	for {
		n, _, err := conn.ReadFromUDP(buffer)
		if err != nil {
			logger.SugarLogger.Errorf("[VCAN:%s] read error: %v", port, err)
			continue
		}
		if n < 16 {
			logger.SugarLogger.Infof("[VCAN:%s] packet too short (%d bytes, need >= 16)", port, n)
			continue
		}

		canID := binary.LittleEndian.Uint32(buffer[0:4])
		length := int(buffer[5])
		if 16+length > n {
			logger.SugarLogger.Infof("[VCAN:%s] payload length %d exceeds packet size %d", port, length, n)
			continue
		}

		nodeID := byte((canID >> 20) & 0xFF)
		nodeName, ok := nodeIDMap[nodeID]
		if !ok {
			nodeName = "unknown"
		}

		message := buffer[6 : 16+length]
		go HandleMessage(config.VehicleID, nodeName, int(canID), message)
	}
}
