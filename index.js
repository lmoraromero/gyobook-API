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
servidor.post("/registro", async (peticion, respuesta) => {
    let { usuario, password } = peticion.body;

    if(!usuario || !password){
        return respuesta.sendStatus(400);
    }

    try{
        let id = await crearUsuario(usuario, password);
        respuesta.status(201);
        //respuesta.send(`usuario con id: ${id}`)
    }catch(error){
        respuesta.status(500);
        respuesta.json( {error : "error en el servidor"} );
    }

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
servidor.get("/libros", async (peticion, respuesta) => {
    try{
        let libros = await buscarLibros();
        respuesta.json(libros);
    }catch(error){
        respuesta.status(500);
        respuesta.json( {error : "error en el servidor"} );
    }
})

//Ruta para crear una ficha de libro nueva
servidor.post("/libro/nuevo", async (peticion, respuesta) => {
    let { titulo, autor, url_portada, genero, fecha_publicacion, paginas, sinopsis } = peticion.body;

    if(!titulo || !autor || !url_portada || !genero || !fecha_publicacion || !paginas || !sinopsis){
        return respuesta.status(400);
    }

    try{
        let id = await crearLibro(titulo, autor, url_portada, genero, fecha_publicacion, paginas, sinopsis);
        respuesta.status(201);
        respuesta.send(`libro con id: ${id}`)
    }catch(error){
        respuesta.status(500);
        respuesta.json( {error : "error en el servidor"} );
    }
})

//Ruta para login del usuario
servidor.post("/reviews/nueva", async (peticion, respuesta) => {
    let { puntuacion, id_usuario, id_libro, texto } = peticion.body;

    if(!puntuacion || !id_usuario || !id_libro || !texto) {
        return respuesta.status(400)
    }

    try{
        let id = await crearReview(puntuacion, id_usuario, id_libro, texto);
        respuesta.status(201);
        respuesta.send(`reseña con id: ${id}`)
    }catch(error){
        respuesta.status(500);
        respuesta.json( {error : "error en el servidor"} );
    }
})

//Ruta para login del usuario
servidor.get("/reviews/:id_libro", async (peticion, respuesta) => {
    let {id_libro} = peticion.params;

    try{
        let reviews = await buscarReviews(id_libro);
        respuesta.json(reviews);
    }catch(error){
        respuesta.status(500);
        respuesta.json( {error : "error en el servidor"} );
    }
})


servidor.listen(process.env.PORT);