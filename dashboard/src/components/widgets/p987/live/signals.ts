// Signal names the p987 ingest publishes, grouped by the ECU that sends
// them. Names are `<bus>_<dbc signal>`: the bus segment comes from the
// relay's CAN_INTERFACES (`can0:pcan`), so these assume the powertrain bus
// is labelled `pcan`. Relabel the interface and these need to follow.
const bus = "pcan";
const on = (...names: string[]) => names.map((n) => `${bus}_${n}`);

// DME — engine management. The full DBC set is ~100 signals across eight
// frames; this is the subset that describes what the engine is doing
// rather than counters, checksums and software revisions.
export const dmeSignals = on(
  "DME_RPM",
  "DME_EngineTorque",
  "DME_DriverTrq",
  "DME_EngineRunning",
  "DME_AccelPedalAngle",
  "DME_APP",
  "DME_CoolantTemp",
  "DME_OilTemp",
  "DME_OilPressure",
  "DME_EngineCompTemp",
  "DME_BoostPressure",
  "DME_AmbientPressure",
  "DME_Lambda_Value",
  "DME_Lambda_Status",
  "DME_EngagedGear",
  "DME_IdleSpeedTarget",
  "DME_FuelConsumption1",
  "DME_FuelConsumption2",
  "DME_Odometer",
  "DME_Interventions",
  "DME_TorqueLoss",
  "DME_ReducedPower",
  "DME_Overboost",
  "DME_CEL_Steady",
  "DME_CEL_Flashing",
  "DME_FuelReserve",
  "DME_OilPressureAlert",
  "DME_OilTempSensFault",
  "DME_ChargingAlert",
  "DME_EngCompFanAlert",
  "DME_RadFanSpeedReq",
  "Outside_Temp",
  "Sport_Mode",
);

// PSM — stability control, and the only source of wheel speeds.
export const psmSignals = on(
  "PSM_WheelSpeedFL",
  "PSM_WheelSpeedFR",
  "PSM_WheelSpeedRL",
  "PSM_WheelSpeedRR",
  "Vref",
  "PSM_BrakePressure",
  "PSM_FootBrake",
  "PSM_HandBrake",
  "Yaw_Rate",
  "Yaw_Rate_Sign",
  "PSM_LateralAccel",
  "Longitudinal_Accel",
  "ABS_Status",
  "ABS_Error",
  "ESP_Control",
  "ESP_Intervention",
  "ESP_Error",
  "ESP_Diag_Mode",
  "PSM_Disabled",
  "ASR_Requirement",
  "ASR_Switching",
  "MSR_Requirement",
  "EBV_Error",
  "Brake_Intervention",
  "Brake_Fluid_Switch",
  "Engagement_Torque",
);

// SCCM — steering column. Angle and rate are magnitude-only, each with a
// separate sign bit, so both are shown rather than combined here.
export const sccmSignals = on(
  "SCCM_SteeringAngle",
  "SCCM_SteeringAngleSign",
  "SCCM_SteeringAngleRate",
  "SCCM_SteeringAngleRateSign",
  "SCCM_CruiseAvailable",
  "SCCM_CruiseEnable",
  "SCCM_CruiseUp",
  "SCCM_CruiseDown",
  "SCCM_CruiseTowards",
  "SCCM_CruiseAway",
);

// PDK — transmission. Absent on manual cars, in which case these stay at
// their zero defaults.
export const pdkSignals = on(
  "PDK_SelectedGear",
  "PDK_ClutchStatus",
  "PDK_OilTemp",
  "PDK_ShiftFork1",
  "PDK_ShiftFork2",
  "PDK_ErrorFlags",
);
