from fastapi import FastAPI

# É este carinha aqui que o terminal estava procurando!
app = FastAPI()


@app.get("/")
def read_root():
    return {"message": "Hello from IA! Rodando no monorepo!"}
