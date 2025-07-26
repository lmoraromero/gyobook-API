import dotenv from "dotenv";
dotenv.config();

//-------------------------------------

import postgres from "postgres";
import bcrypt from "bcrypt";


//Función para conectarse a postgres
function conectar(){
    return postgres({
        host : process.env.DB_HOST,
        database : process.env.DB_NAME,
        user : process.env.DB_USER,
        password : process.env.DB_PASSWORD,
        port: process.env.DB_PORT,
        ssl: {
            rejectUnauthorized: false //activa la conexión segura (SSL), pero desactiva la validación estricta del certificado
        }
    });
}

//Función para crear usuario
//La función recibirá como argumentos: nombre(string) y password (string sin hashear) y generará una foto de perfil aleatoria, devolviendo todos los datos
export function crearUsuario(usuario, password){
    return new Promise((ok, ko) => {
        const sql = conectar(); //conectar a la base de datos

        let perfil = `/img/pfp/profile-${Math.floor(Math.random() * 8) + 1}.png` //generamos una foto de perfil aleatoria para el usuario (estas imágenes se encuentran en una carpeta del front)

        //hasheamos la contraseña
        bcrypt.hash(password, 10)
        .then(hashPassword => {
            //insertamos en la BBDD con el hash
            return sql`
                INSERT INTO users (usuario, password, perfil) 
                VALUES (${usuario}, ${hashPassword}, ${perfil}) 
                RETURNING id, perfil
            `;
        })
        .then(([{ id, perfil }]) => {
            sql.end(); //cerramos conexión
            ok({ id, usuario : usuario, perfil }); //devolvemos el id, el usuario y la foto de perfil para el front
        })
        .catch( error => {
            sql.end(); //cerramos conexión también si hay error
            ko({ error: "error en la base de datos" });
        } )
    });
}

//Función para buscar si el usuario está en la BBDD
//La función recibirá como argumento el nombre de usuario
export function buscarUsuario(usuario){
    return new Promise((ok, ko) => {

        const sql = conectar();

        sql`SELECT * FROM users WHERE usuario = ${usuario}`
        .then( resultado => {
            sql.end();
            ok(resultado) 
        })
        .catch( error => {
            sql.end(); 
            ko({ error: "error en la base de datos" });
        } )
    });
}


//Función para crear fichas de libros
//La función recibirá como argumentos: título(string), autor(string), páginas(integer), fecha_publicacion(formato date -> YYYY-MM-DD), url_portada (string con la url), sinopsis(string), género(string) y devolverá el id
export function crearLibro(titulo, autor, url_portada, genero, fecha_publicacion, paginas, sinopsis){
    return new Promise((ok, ko) => {
        const sql = conectar();

        sql`INSERT INTO books (titulo, autor, url_portada, genero, fecha_publicacion, paginas, sinopsis) VALUES (${titulo}, ${autor}, ${url_portada}, ${genero}, ${fecha_publicacion}, ${paginas}, ${sinopsis}) RETURNING id`
        .then(([{ id }]) => {
            sql.end(); 
            ok(id);   
        })
        .catch( error => {
            sql.end(); 
            ko({ error: "error en la base de datos" });
        } )
    });
}


//Función para buscar todos los libros de la BDD
//Esta función trae todos los libros de la BBDD, ordenándolos por orden de creación (es decir, el id descendente)
export function buscarLibros(){
    return new Promise((ok, ko) => {

        const sql = conectar();

        sql`SELECT * FROM books ORDER BY id DESC`
        .then( resultado => {
            sql.end();
            ok(resultado) 
        })
        .catch( error => {
            sql.end(); 
            ko({ error: "error en la base de datos" });
        } )
    });
}

//Función para buscar libro por id
//La función recibe como argumento el id del libro para poder buscarlo
export function buscarLibroId(id){
    return new Promise((ok, ko) => {

        const sql = conectar();

        sql`SELECT * FROM books WHERE id = ${id}`
        .then( resultado => {
            sql.end();
            ok(resultado) 
        })
        .catch( error => {
            sql.end(); 
            ko({ error: "error en la base de datos" });
        } )
    });
}

//Función para crear reseñas de libros
//La función recibirá como argumentos: creada_en(timestamp, now()), puntuacion(numeric, entre 1-5), id_usuario(integer), id_libro(integer), texto(string) y devolverá el id
export function crearReview(puntuacion, id_usuario, id_libro, texto){
    return new Promise((ok, ko) => {
        const sql = conectar();

        sql`INSERT INTO reviews (creada_en, puntuacion, id_usuario, id_libro, texto) VALUES (now(), ${puntuacion}, ${id_usuario}, ${id_libro}, ${texto}) RETURNING id`
        .then(([{ id }]) => {
            sql.end(); 
            ok(id);    
        })
        .catch( error => {
            sql.end(); 
            ko({ error: "error en la base de datos" });
        } )
    });
}

//Función para buscar todas las reviews de un libro 
//La función recibe como argumento el id del libro para bsucar las reseñas pertenecientes a ese libro y las trae ordenadas de más reciente a más antigua
//Se realiza un JOIN con la tabla users en la petición para poder traer los datos del usuario también al front
export function buscarReviews(id_libro){
    return new Promise((ok, ko) => {

        const sql = conectar();

        sql`SELECT reviews.*, users.usuario AS nombre_usuario, users.perfil FROM reviews 
            JOIN users ON reviews.id_usuario = users.id
            WHERE id_libro = ${id_libro} ORDER BY creada_en DESC`
        .then( resultado => {
            sql.end();
            ok(resultado) 
        })
        .catch( error => {
            sql.end(); 
            ko({ error: "error en la base de datos" });
        } )
    });
}

//Función para buscar todas las reseñas de un usuario
//Recibe como argumento el id del usuario paar ver todas las reseñas creadas por el usuario, además de traerlas de más antigua a más nueva
//Se realiza un JOIN con la tabla books en la petición para traer lso datos del libro reseñado en el front
export function buscarReviewsUsuario(id_usuario){
    return new Promise((ok, ko) => {
        const sql = conectar();

        sql`SELECT reviews.*, books.titulo, books.autor, books.url_portada FROM reviews 
        JOIN books ON reviews.id_libro = books.id
        WHERE id_usuario = ${id_usuario} ORDER BY creada_en DESC`
        .then(resultado => {
            sql.end();
            ok(resultado);
        })
        .catch(error => {
            sql.end();
            ko({ error: "error en la base de datos" });
        });
    });
}

//Función para realizar una búsuqeda por libro y/o autor
//Recibe como argumento el texto que se va a buscar
export function busqueda(texto){
    return new Promise((ok, ko) => {
        const sql = conectar();
        let palabra = `%${texto}%`; //hace que la base de datos busque cualquier cosa que tenga esa palabra

        //Lo que hace la query es: compara con LIKE, ignorando las mayúsculas y las minúsculas usando LOWER
        sql`SELECT * FROM books WHERE LOWER(titulo) LIKE LOWER(${palabra}) OR LOWER(autor) LIKE LOWER(${palabra}) OR LOWER(genero) LIKE LOWER(${palabra})`
        .then(resultado => {
            sql.end();
            ok(resultado)
        })
        .catch(error => {
            sql.end();
            ko({ error: "error en la base de datos" });
        })

    })
}