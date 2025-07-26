import dotenv from "dotenv";
dotenv.config();

//-------------------------------------

//Importaciones

import express from "express";
import cors from "cors";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import multer from "multer";
import cloudinary from 'cloudinary';
import { CloudinaryStorage } from 'multer-storage-cloudinary';
import { buscarUsuario, crearUsuario, crearLibro, buscarLibros, buscarLibroId, crearReview, buscarReviews, buscarReviewsUsuario, busqueda } from "./datos.js";


//Configurar cloudinary con variables de entorno
//De esta forma nos autentificamos para poder utilizar la API de cloudinary
cloudinary.v2.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET,
});

//Configuración de cloudinary para subir imágenes a la carpeta portadas de cloudinary
//integramos multer con cloudinary, al hacer la subida con multer, la imagen se guarda en la nube
const guardar = new CloudinaryStorage({
    cloudinary: cloudinary.v2,
    params : {
        folder : "portadas",
        allowed_formats : ["jpg", "jpeg", "png"],
        public_id : (peticion, fichero) => {
            return Date.now() + "-" + fichero.originalname.replace(/\s+/g, "_") //reemplaza todos los espacios en blanco del nombre original del archivo, para poder mantener la ruta más limpia
        },
    },
});


//Función para generar un token JWT con los datos que se proporcionan (en el front recibirá el usuario y el id)
//La función retornará el token 
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
        respuesta.sendStatus(403); //el token ha expirado o es inválido
    });
}

//Crear el servidor
const servidor = express();

//Usando al configuración de guardar, enviamos a la nube los archivos, en lugar de guardarlos de forma local
//Las imágenes se suben directamente a Cloudinary y genera una url pública para poder mostrar la imagen en el front
const upload = multer({ storage : guardar });

//Middleware para permitir que el servidor acepte peticiones desde otros dominios
servidor.use(cors());

//Middleware para interpretar JSON en las peticiones
servidor.use(express.json());

//Middlewares

//Ruta para registro de usuarios
servidor.post("/registro", async (peticion, respuesta) => {

    //recibimos el usuario y la contraseña de la petición 
    let { usuario, password } = peticion.body;

    //validar los campos paar que no estén vacíos
    if(!usuario || !password){
        return respuesta.sendStatus(400); //con status 400 gestionaremos en el front los errores, mostrando que faltan datos por rellenar
    }

    try{
        let {id, usuario: nombreUsuario, perfil} = await crearUsuario(usuario, password); //llamamos a la función crearusuario pasándole los parámetros 

        //generar token con id y usuario
        let token = generarToken({id, usuario: nombreUsuario})

        respuesta.status(201).json({token, usuario: { id, usuario: nombreUsuario, perfil } }); //envía el token y el usuario para el registro
        //respuesta.send(`usuario con id: ${id}`)

    }catch(error){
        respuesta.status(500);
        respuesta.json({ error : "Error en el servidor" });
    }

});

//Ruta para login del usuario
servidor.post("/login", async (peticion, respuesta) => {

    let {usuario, password} = peticion.body;

    try{
        let posibleUsuario = await buscarUsuario(usuario) //llamamos a la función buscarUsuario para ver que el usuario existe en la BBDD

        if(posibleUsuario.length == 0){
            return respuesta.sendStatus(401); //se responde con 404, unauthorized --> no se ha encontrado el usuario en la BBDD
        }

        //comparamos la contraseña enviada con la contraseña hasheada en la BBDD
        let valido = await bcrypt.compare(password, posibleUsuario[0].password);

        if(!valido){
            return respuesta.sendStatus(403); //se responde con 403, forbidden --> la contraseña es incorrecta
        }

        //genera el token y se envían los datos del usuario si todo es correcto
        respuesta.json({ token : generarToken({
            id : posibleUsuario[0].id,
            usuario : posibleUsuario[0].usuario
        }),
            id : posibleUsuario[0].id,
            usuario : posibleUsuario[0].usuario,
            perfil : posibleUsuario[0].perfil 
        });
    }catch(error){
        siguiente(error); //en caso de error inesperado, se pasa al middleware de errores
    }
})

//Ruta para traer todos los libros
servidor.get("/libros", async (peticion, respuesta, siguiente) => {
    try{
        let libros = await buscarLibros(); //llamamos a la función buscarLibros, para traer desde la BBDD todos los libros

        //la lista de libros se envía en formato JSON como respuesta
        respuesta.json(libros);
    }catch(error){
        siguiente(error);
    }
})

//Ruta para crear una ficha de libro nueva
//Sólo los usuarios podrán crear fichas de libros
servidor.post("/libro/nuevo", autorizar, upload.single("portada"), async (peticion, respuesta, siguiente) => {

    let { titulo, autor, genero, fecha_publicacion, paginas, sinopsis } = peticion.body;

    //obtenemos la ruta del archivo de portada si se ha subido correctamente
    let url_portada = peticion.file ? peticion.file.path : null;

    //validación de todos los campos para comprobar que están presentes
    if(!titulo || !autor || !genero || !fecha_publicacion || !paginas || !sinopsis){
        return respuesta.status(400);
    }

    //validar de que se ha subido una imagen de portada
    if(!peticion.file){
        return respuesta.status(400);
    }

    //validación de tipo de datos y formato: que las páginas sean un número y que sean mayor a 0
    let paginasNum = Number(paginas);
    if (!Number.isInteger(paginasNum) || paginasNum <= 0) {
        return respuesta.status(422); //status 422 para decir que hay datos, pero no son válidos
    }

    //validacion de fecha con expresión regular para que se envíe como AAAA-MM-DD
    let regexFecha = /^\d{4}-\d{2}-\d{2}$/;
    if (!regexFecha.test(fecha_publicacion)) {
        return respuesta.status(422);
    }

    try{
        let id = await crearLibro(titulo, autor, url_portada, genero, fecha_publicacion, paginasNum, sinopsis); //llamamos a la función crearLibro para guardarlo en la BBDD
        respuesta.status(201).json({ id }); //status 201 (created) para indicar que la ficha se ha creado con éxito y devolviendo el id
        //respuesta.send(`libro con id: ${id}`)
    }catch(error){
        siguiente(error);
    }
})

//Ruta de un libro en concreto según su id
servidor.get("/libro/:id", async (peticion, respuesta, siguiente) => {

    //se extrae el id del libro de los parámetros de la url
    let {id} = peticion.params;

    try{
        let libro = await buscarLibroId(id); //llamamos a la función buscarLibro 

        //si no encuentra el libro, respondemos con 404
        if(!libro){
            return respuesta.status(404);
        }

        //si encuentra el libro, enviamos al información del libro en formato JSON
        respuesta.json(libro);
    }catch(error){
        siguiente(error);
    }
})

//Ruta para crear una reseña nueva por el usuario
//sólo usuarios conectados pueden acceder a ella, usando autorizar
servidor.post("/reviews/nueva", autorizar, async (peticion, respuesta, siguiente) => {

    let { puntuacion, id_usuario, id_libro, texto } = peticion.body;

    //validación básica: comprobar que existen los datos
    if(!puntuacion || !id_usuario || !id_libro) {
        return respuesta.status(400)
    }

    //validamos que la puntuación sea mayor a uno pero que no supere 5
    if (puntuacion < 1 || puntuacion > 5) {
    return respuesta.status(422); 
}

    try{
        let id = await crearReview(puntuacion, id_usuario, id_libro, texto); //llamamos a la función para crear la reseña en la BBDD

        respuesta.sendStatus(201); //status 201 (created) para indicar que al reseña se ha creado con éxito
        //respuesta.send(`reseña con id: ${id}`)
    }catch(error){
        siguiente(error);
    }
})

//Ruta para traer todas las reseñas de un libro
//La ruta para ver las reseñas de los libros es pública, no es necesario estar autenticado
servidor.get("/reviews/:id_libro", async (peticion, respuesta, siguiente) => {

    //se extrae el id del libro de los parámetros de la url
    let {id_libro} = peticion.params; 

    try{
        let reviews = await buscarReviews(id_libro); //llamamos a buscar reseñas en la BBDD 

        //responde con las reseñas en formato JSON
        respuesta.json(reviews);
    }catch(error){
        siguiente(error);
    }
})

//Ruta para traer todas las reseñas de un usuario específico
servidor.get("/reviews/usuario/:id_usuario", async (peticion, respuesta, siguiente) => {

    //se extrae el id del usuario de los parámetros de la url
    let { id_usuario } = peticion.params;

    try {
        let reviews = await buscarReviewsUsuario(id_usuario); //llamamos a la función para traer todas als reseñas que coincidan con el id del usuario

        //responde con las reseñas en formato JSON
        respuesta.json(reviews);
    }catch(error){
        siguiente(error);
    }
});

//Ruta para buscar libros por título, autor o género
servidor.get("/busqueda", async (peticion, respuesta, siguiente) => {

    let {texto} = peticion.query; //los datos se envían como parámetros de consulta en la URL

    try{
        let resultado = await busqueda(texto); //llamamos a la funcion para consultar en la BBDD del texto 

        //se responde con el resultado en formato JSON
        respuesta.status(200).json(resultado);
    }catch(error){
        siguiente(error);
    }
})


//Middleware para manejar errores (cualquier error que ocurra en rutas o middleware previos)
//Envía una respuesta con código 500(Error en el servidor) y un mensaje genérico de error
servidor.use((error, peticion, respuesta, siguiente) => {
    respuesta.status(500);
    respuesta.json({ error : "Error en el servidor" });
});

//Middleware para rutas no encontradas (404)
//Cuando ninguna de las rutas anteriores coinciden con la petición 
servidor.use((peticion, respuesta) => {
    respuesta.status(404);
    respuesta.json({ error : "Recurso no encontrado" });
});

//El servidor escuchará las peticiones en el puerto especificado en las variables de entorno
servidor.listen(process.env.PORT);