import dotenv from "dotenv";
dotenv.config();

//-------------------------------------

//Importaciones

import express from "express";
import cors from "cors";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import { buscarUsuario, crearUsuario, crearLibro, buscarLibros, crearReview, buscarReviews, buscarReviewsUsuario } from "./datos.js";

//Crear el servidor
const servidor = express();

//Middleware para permitir que el servidor acepte peticiones desde otros dominios
servidor.use(cors());

//Middleware para interpretar JSON en las peticiones
servidor.use(express.json());

//Función para generar un token JWT con los datos que se proporcionan (en el front recibirá el usuario y el id)
//la función retornará el token 
function generarToken(datos){ //objeto con los datos
    return jwt.sign(datos, process.env.SECRET);
}

//Función para verificar que existe un token válido y así proteger las rutas que requieren autentificación
function autorizar(peticion, respuesta, siguiente){

    //se extrae el token del header authorization
    let token = peticion.headers.authorization ? peticion.headers.authorization.split(" ")[1] : undefined;

    if(!token){
        return respuesta.sendStatus(401); //no autorizado si no hay token
    }

    //se verifica y se decodifica el token
    jwt.verify(token, process.env.SECRET, (error, datos) => {

        if(!error){ //guardar los datos del usuario en la peticion para usar luego en las rutas protegidas
            peticion.usuario = {id : datos.id, usuario : datos.usuario};
            return siguiente(); //continúa al siguiente middleware
        }
        respuesta.sendStatus(403); //el token a expirado o es inválido
    });
}

//Middlewares

//Ruta para registro de usuarios
servidor.post("/registro", async (peticion, respuesta) => {
    let { usuario, password } = peticion.body;

    //validar los campos
    if(!usuario || !password){
        return respuesta.sendStatus(400);
    }

    try{
        let id = await crearUsuario(usuario, password);

        //generar token con id y usuario
        let token = generarToken({id, usuario})

        respuesta.status(201).json({token}); //envía el token para el registro
        //respuesta.send(`usuario con id: ${id}`)

    }catch(error){
        siguiente(error);
    }

});

//Ruta para login del usuario
servidor.post("/login", async (peticion, respuesta) => {
    let {usuario, password} = peticion.body;

    try{
        let posibleUsuario = await buscarUsuario(usuario)

        if(posibleUsuario.length == 0){
            return respuesta.sendStatus(401); //Unauthorized --> no se ah encontrado el usuario
        }

        let valido = await bcrypt.compare(password, posibleUsuario[0].password);

        if(!valido){
            return respuesta.sendStatus(403); //Forbidden --> la contraseña es incorrecta
        }

        //genera el token y se envía
        respuesta.json({ token : generarToken({
            id : posibleUsuario[0].id,
            usuario : posibleUsuario[0].usuario
        })});
    }catch(error){
        siguiente(error);
    }
})

//Ruta para traer todos los libros
servidor.get("/libros", async (peticion, respuesta) => {
    try{
        let libros = await buscarLibros();

        respuesta.json(libros);
    }catch(error){
        siguiente(error);
    }
})

//Ruta para crear una ficha de libro nueva
//sólo los usuarios podrán crear fichas de libros
servidor.post("/libro/nuevo", autorizar, async (peticion, respuesta) => {
    let { titulo, autor, url_portada, genero, fecha_publicacion, paginas, sinopsis } = peticion.body;

    //validación de campos
    if(!titulo || !autor || !url_portada || !genero || !fecha_publicacion || !paginas || !sinopsis){
        return respuesta.status(400);
    }

    //validación de tipo de datos y formato: que las páginas sean un número y que sean mayor a 0
    if (!Number.isInteger(paginas) || paginas <= 0) {
        return respuesta.status(422); //hay datos, pero no son válidos
    }

    //validacion de fecha con expresión regular para que se envíe como AAAA-MM-DD
    let regexFecha = /^\d{4}-\d{2}-\d{2}$/;
    if (!regexFecha.test(fecha_publicacion)) {
        return respuesta.status(422);
    }

    try{
        let id = await crearLibro(titulo, autor, url_portada, genero, fecha_publicacion, paginas, sinopsis);
        respuesta.status(201);
        //respuesta.send(`libro con id: ${id}`)
    }catch(error){
        siguiente(error);
    }
})

//Ruta para crear una reseña nueva por el usuario
//sólo usuarios logueados pueden acceder a ella 
servidor.post("/reviews/nueva", autorizar, async (peticion, respuesta) => {
    let { puntuacion, id_usuario, id_libro, texto } = peticion.body;

    //validación básica
    if(!puntuacion || !id_usuario || !id_libro || !texto) {
        return respuesta.status(400)
    }

    //Que la puntuación sea mayor a uno pero que no supere 5
    if (puntuacion < 1 || puntuacion > 5) {
    return respuesta.status(422); 
}

    try{
        let id = await crearReview(puntuacion, id_usuario, id_libro, texto);
        respuesta.status(201);
        //respuesta.send(`reseña con id: ${id}`)
    }catch(error){
        siguiente(error);
    }
})

//Ruta para traer todas las reseñas de un libro
//toda persona podrá entrar, aunque no pueda crear ni fichas ni reseñas
servidor.get("/reviews/:id_libro", async (peticion, respuesta) => {
    //se saca la id del libro desde params
    let {id_libro} = peticion.params; 

    try{
        let reviews = await buscarReviews(id_libro);
        respuesta.json(reviews);
    }catch(error){
        siguiente(error);
    }
})

//Ruta para traer todas las reseñas de un usuario
servidor.get("/reviews/usuario/:id_usuario", async (peticion, respuesta) => {
    let { id_usuario } = peticion.params;

    try {
        let reviews = await buscarReviewsUsuario(id_usuario);
        respuesta.json(reviews);
    } catch (error) {
        siguiente(error);
    }
});


// Middleware para manejar errores (cualquier error que ocurra en rutas o middleware previos)
servidor.use((error, peticion, respuesta, siguiente) => {
    respuesta.status(500);
    respuesta.json({ error : "Error en el servidor" });
});

// Middleware para rutas no encontradas (404)
servidor.use((peticion, respuesta) => {
    respuesta.status(404);
    respuesta.json({ error : "Recurso no encontrado" });
});


servidor.listen(process.env.PORT);