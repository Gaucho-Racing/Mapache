import numpy as np

class Wheel:
    suspension: int
    wheel_speed: int
    tire_pressure: int
    imu_accel_x: int
    imu_accel_y: int
    imu_accel_z: int
    imu_gyro_x: int
    imu_gyro_y: int
    imu_gyro_z: int
    brake_temp_one: int
    brake_temp_two: int
    brake_temp_three: int
    brake_temp_four: int
    brake_temp_five: int
    brake_temp_six: int
    brake_temp_seven: int
    brake_temp_eight: int
    tire_temp_one: int
    tire_temp_two: int
    tire_temp_three: int
    tire_temp_four: int
    tire_temp_five: int
    tire_temp_six: int
    tire_temp_seven: int
    tire_temp_eight: int

    @classmethod
    def createByteArray(cls):
        initList = []
        initList.append(cls.suspension)
        initList += Wheel.toByes((cls.wheel_speed),2)
        initList.append(cls.tire_pressure)
        initList += [0]*4
        initList += Wheel.toBytes(cls.imu_accel_x, 2)
        initList += Wheel.toBytes(cls.imu_accel_y, 2)
        initList += Wheel.toBytes(cls.imu_accel_z, 2)
        initList += [0]*2
        initList += Wheel.toBytes(cls.imu_gyro_x, 2)
        initList += Wheel.toBytes(cls.imu_gyro_y, 2)
        initList += Wheel.toBytes(cls.imu_gyro_z, 2)
        initList += [0]*2
        initList.append(cls.brake_temp_one)
        initList.append(cls.brake_temp_two)
        initList.append(cls.brake_temp_three)
        initList.append(cls.brake_temp_four)
        initList.append(cls.brake_temp_five)
        initList.append(cls.brake_temp_six)
        initList.append(cls.brake_temp_seven)
        initList.append(cls.brake_temp_eight)
        initList.append(cls.tire_temp_one)
        initList.append(cls.tire_temp_two)
        initList.append(cls.tire_temp_three)
        initList.append(cls.tire_temp_four)
        initList.append(cls.tire_temp_five)
        initList.append(cls.tire_temp_six)
        initList.append(cls.tire_temp_seven)
        initList.append(cls.tire_temp_eight)
        return bytearray(initList)

    @classmethod
    def decodeByteArray(cls, byteArrayList):
        cls.suspension = byteArrayList[0]
        cls.wheel_speed = Wheel.toDec(byteArrayList[1:3])
        cls.tire_pressure = byteArrayList[3]
        cls.imu_accel_x = Wheel.toDec(byteArrayList[8:10])
        cls.imu_accel_y = Wheel.toDec(byteArrayList[10:12])
        cls.imu_accel_z = Wheel.toDec(byteArrayList[12:14])
        cls.imu_gyro_x = Wheel.toDec(byteArrayList[16:18])
        cls.imu_gyro_y = Wheel.toDec(byteArrayList[18:20])
        cls.imu_gyro_z = Wheel.toDec(byteArrayList[20:22])
        cls.brake_temp_one = byteArrayList[24]
        cls.brake_temp_two = byteArrayList[25]
        cls.brake_temp_three = byteArrayList[26]
        cls.brake_temp_four = byteArrayList[27]
        cls.brake_temp_five = byteArrayList[28]
        cls.brake_temp_six = byteArrayList[29]
        cls.brake_temp_seven = byteArrayList[30]
        cls.brake_temp_eight = byteArrayList[31]
        cls.tire_temp_one = byteArrayList[32]
        cls.tire_temp_two = byteArrayList[33]
        cls.tire_temp_three = byteArrayList[34]
        cls.tire_temp_four = byteArrayList[35]
        cls.tire_temp_five = byteArrayList[36]
        cls.tire_temp_six = byteArrayList[37]
        cls.tire_temp_seven = byteArrayList[38]
        cls.tire_temp_eight = byteArrayList[39]

    def toBytes(rawVal, numBytes): #numBytes is prob always 2
        negative = False
        if rawVal < 0:
            negative = True
            rawVal = abs(rawVal)
        binaryRep = bin(rawVal)[bin(rawVal).index('b')+1:]

        if numBytes == 1 and rawVal <= 255 and rawVal >= 0: #never gunna use this lmao
            return [rawVal]
        
        elif numBytes == 2 and rawVal < 32768: #excludes -32768 cuz lazy
            while len(binaryRep) < 16:
                binaryRep = '0' + binaryRep

            byte1 = int(binaryRep[:8],2)
            byte2 = int(binaryRep[8:],2)
            if negative:
                byte1 = int(Wheel.invertBin(binaryRep[:8]), 2)
                byte2 = int(Wheel.invertBin(binaryRep[8:]), 2)
            
            return [byte1, byte2]
        
        return 0

    def toDec(bytes_list): #only concat 2, convert back
        negative = False
        
        if len(bytes_list) != 2:
            return None

        byte1 = bin(bytes_list[0])[bin(bytes_list[0]).index('b')+1:]
        byte2 = bin(bytes_list[1])[bin(bytes_list[1]).index('b')+1:]

        if len(byte1) == 8:
            negative = True

        while len(byte2) < 8:
            byte2 = '0' + byte2

        concat = byte1 + byte2
        if negative:
            return int(Wheel.invertBin(concat), 2) * -1
        return int(concat, 2)

    def invertBin(binVal):
        binVal = str(binVal)
        temp = ''
        for i in binVal:
            temp += str(1-int(i))
        return temp
    
    @classmethod
    def genRandomValues(cls):
        cls.suspension = np.random.randint(0,99)
        cls.wheel_speed = 0
        cls.tire_pressure = np.random.randint(20,40)
        cls.imu_accel_x = np.random.randint(-32767,32768)
        cls.imu_accel_y = np.random.randint(-32767,32768)
        cls.imu_accel_z = np.random.randint(-32767,32768)
        cls.imu_gyro_x = np.random.randint(-32767,32768)
        cls.imu_gyro_y = np.random.randint(-32767,32768)
        cls.imu_gyro_z = np.random.randint(-32767,32768)
        cls.brake_temp_one = np.random.randint(0,256) #should be 1 random number with noise for all but wtvr
        cls.brake_temp_two = np.random.randint(0,256)
        cls.brake_temp_three = np.random.randint(0,256)
        cls.brake_temp_four = np.random.randint(0,256)
        cls.brake_temp_five = np.random.randint(0,256)
        cls.brake_temp_six = np.random.randint(0,256)
        cls.brake_temp_seven = np.random.randint(0,256)
        cls.brake_temp_eight = np.random.randint(0,256)
        cls.tire_temp_one = np.random.randint(0,256)
        cls.tire_temp_two = np.random.randint(0,256)
        cls.tire_temp_three = np.random.randint(0,256)
        cls.tire_temp_four = np.random.randint(0,256)
        cls.tire_temp_five = np.random.randint(0,256)
        cls.tire_temp_six = np.random.randint(0,256)
        cls.tire_temp_seven = np.random.randint(0,256)
        cls.tire_temp_eight = np.random.randint(0,256)