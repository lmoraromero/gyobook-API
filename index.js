import dotenv from "dotenv";
dotenv.config();

//-------------------------------------

import express from "express";
import cors from "cors";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import { buscarUsuario, crearUsuario, crearLibro, buscarLibros, crearReview, buscarReviews } from "./datos.js";

const servidor = express();

servidor.use(cors());

servidor.use(express.json());


function generarToken(datos){ //objeto con los datos
    return jwt.sign(datos, process.env.SECRET);
}

function autorizar(peticion, respuesta, siguiente){
    let token = peticion.headers.authorization ? peticion.headers.authorization.split(" ")[1] : undefined;

    if(!token){
        return respuesta.sendStatus(401);
    }

    jwt.verify(token, process.env.SECRET, (error, datos) => {

        if(!error){
            peticion.usuario = {id : datos.id, usuario : datos.usuario};
            return siguiente();
        }
        respuesta.sendStatus(403);
    });
}

//Ruta para registro de usuarios
servidor.post("/registro", (peticion, respuesta) => {
    respuesta.send("...registro de usuario")
});

//Ruta para login del usuario
servidor.post("/login", async (peticion, respuesta) => {
    let {usuario, password} = peticion.body;

    try{
        let posibleUsuario = await buscarUsuario(usuario)

        if(posibleUsuario.length == 0){
            return respuesta.sendStatus(401);
        }

        let valido = await bcrypt.compare(password, posibleUsuario[0].password);

        if(!valido){
            return respuesta.sendStatus(403);
        }

        respuesta.json({ token : generarToken({
            id : posibleUsuario[0].id,
            usuario : posibleUsuario[0].usuario
        })});
    }catch(error){
        respuesta.status(500);
        respuesta.json( {error : "error en el servidor"} );
    }
})

//Ruta para traer todos los libros
servidor.get("/libros", (peticion, respuesta) => {
    respuesta.send("......mostrando libros")
})

//Ruta para crear una ficha de libro nueva
servidor.post("/libro/nuevo", (peticion, respuesta) => {
    respuesta.send(".....libro nuevo")
})

//Ruta para login del usuario
servidor.post("/reviews/nueva", (peticion, respuesta) => {
    respuesta.send(".....nueva reseña")
})

//Ruta para login del usuario
servidor.get("/reviews/:id_libro", (peticion, respuesta) => {
    respuesta.send(`review del libro con id ${peticion.params.id_libro}`)
})


servidor.listen(process.env.PORT);