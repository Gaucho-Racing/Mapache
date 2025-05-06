from fastapi import FastAPI  
import uvicorn
from query.config.config import Config
from query.database.connection import init_db
from query.routes import ping
from query.service.query import merge_to_largest, query_signals, merge_to_smallest

def create_app():
    app = FastAPI(
        title="Gaucho Racing Query",
        description="API Documentation",
        version=Config.VERSION
    )

    app.include_router(
        ping.router,
        prefix="/query",
        tags=["Ping"]
    )
    
    # app.include_router(
    #     query.router,
    #     prefix="/query",
    #     tags=["Query"]
    # )

    # app.add_middleware(LogMiddleware)
    
    return app

def main():
  init_db()
  signals = query_signals(
     vehicle_id='gr24',
     signals=['vdm_speed', 'inverter_erpm', 'acu_cell34_voltage', 'pedal_apps_one', 'mobile_accelerometer_x'],
     start='2024-11-09 22:53:55.00',
     end='2024-11-09 22:57:41.00'
    )
  result, metadata = merge_to_smallest(*signals, tolerance=50)
  print(result)
  print(metadata)

  result, metadata = merge_to_largest(*signals, tolerance=50)
  print(result)
  print(metadata)

#   app = create_app()
#   uvicorn.run(app, host="0.0.0.0", port=Config.PORT)

if __name__ == "__main__":
  main()
