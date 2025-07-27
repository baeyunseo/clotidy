from fastapi import FastAPI
from category_model.main import app as category_app 
from color_model.color_api import app as color_app

app = FastAPI()

# Include endpoints from category model
for route in category_app.routes:
    app.router.routes.append(route)

# Include endpoints from color model
for route in color_app.routes:
    app.router.routes.append(route)
