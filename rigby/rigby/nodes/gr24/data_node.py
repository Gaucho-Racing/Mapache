
class data_node:
    #data node should initialize with a list/dict of variables so that a singular testing method may be written for all nodes
    
    @classmethod
    def to_bytes(cls, raw_val, num_bytes):  # num_bytes is probably always 2
        negative = False
        if raw_val < 0:
            negative = True
            raw_val = abs(raw_val)
        binaryRep = bin(raw_val)[bin(raw_val).index('b')+1:]

        if num_bytes == 1 and raw_val <= 255 and raw_val >= 0: #never gunna use this lmao
            return [raw_val]
        
        elif num_bytes == 2 and raw_val < 32768: #excludes -32768 cuz lazy
            while len(binaryRep) < 16:
                binaryRep = '0' + binaryRep

            byte1 = int(binaryRep[:8],2)
            byte2 = int(binaryRep[8:],2)
            if negative:
                byte1 = int(cls.invertBin(binaryRep[:8]), 2)
                byte2 = int(cls.invertBin(binaryRep[8:]), 2)
            
            return [byte1, byte2]
        
        return 0

    @classmethod
    def to_dec(cls, bytes_list, num_bytes=None):  # only concatenate 2, convert back
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
            return int(cls.invertBin(concat), 2) * -1
        return int(concat, 2)

    def invertBin(binVal):
        binVal = str(binVal)
        temp = ''
        for i in binVal:
            temp += str(1-int(i))
        return temp