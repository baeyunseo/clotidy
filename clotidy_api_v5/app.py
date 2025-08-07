from fastapi import FastAPI
from category_model.category_api import router as category_router
from color_model.color_api import router as color_router
from recommend.core_recommend import router as core_router
from recommend.situation_recommend import router as situation_router

app = FastAPI()

app.include_router(category_router, prefix="/category")
app.include_router(color_router, prefix="/color")
app.include_router(core_router, prefix="/recommend")
app.include_router(situation_router, prefix="/situation")