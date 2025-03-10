from fastapi import FastAPI  
from query.service.query import merge_to_largest, merge_to_largest_fill, query_signal, analyze_signal_df, raw_merge_df, resample_ffill
import uvicorn
from query.config.config import Config
from query.database.connection import init_db

def main():
  init_db()
  app = FastAPI()
  
  # uvicorn.run(app, host="0.0.0.0", port=Config.PORT)

  start_time = "2024-11-09 20:21:38"
  end_time = "2024-11-09 20:25:54"
  
  print("\n------- ACU CELL 1 TEMP -------\n")
  df1 = query_signal("gr24", "acu_cell1_temp", start_time, end_time)
  print(df1)
  analyze_signal_df(df1)
  
  print("\n------- INVERTER MOTOR TEMP -------\n")
  df2 = query_signal("gr24", "inverter_motor_temp", start_time, end_time)
  print(df2)
  analyze_signal_df(df2)
  
  print("\n------- PEDAL APPS ONE -------\n")
  df3 = query_signal("gr24", "pedal_apps_one", start_time, end_time)
  print(df3)
  analyze_signal_df(df3)

  print("\n------- VDM SPEED -------\n")
  df4 = query_signal("gr24", "vdm_speed", start_time, end_time)
  print(df4)
  analyze_signal_df(df4)

  print("\n------- MOBILE SPEED -------\n")
  df5 = query_signal("gr24", "mobile_speed", start_time, end_time)
  print(df5)
  analyze_signal_df(df5)

  print("\n------- MOBILE LATITUDE -------\n")
  df6 = query_signal("gr24", "mobile_latitude", start_time, end_time)
  print(df6)
  analyze_signal_df(df6)

  print("\n------- MOBILE LONGITUDE -------\n")
  df7 = query_signal("gr24", "mobile_longitude", start_time, end_time)
  print(df7)
  analyze_signal_df(df7)

  print("\n------- RAW MERGE -------\n")
  merged_df = raw_merge_df(df1, df2, df3, df4, df5, df6, df7)
  print(merged_df)
  analyze_signal_df(merged_df)

  print("\n------- MERGE TO LARGEST -------\n")
  merged_df = merge_to_largest(df1, df2, df3, df4, df5, df6, df7)
  print(merged_df)
  analyze_signal_df(merged_df)

  print("\n------- MERGE TO LARGEST FORWARD FILL -------\n")
  merged_df = merge_to_largest_fill(df1, df2, df3, df4, df5, df6, df7)
  print(merged_df)
  analyze_signal_df(merged_df)

  print("\n------- RESAMPLE INTERVAL -------\n")
  merged_df = resample_ffill(merged_df, "0.1s")
  print(merged_df)
  analyze_signal_df(merged_df)

if __name__ == "__main__":
  main()