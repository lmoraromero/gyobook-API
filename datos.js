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
    });
}

//Función para crear usuario
//La función recibirá como argumentos: nombre(string) y password (string sin hashear) y devolverá un número, el id del usuario creado
export function crearUsuario(usuario, password){
    return new Promise((ok, ko) => {
        const sql = conectar(); // conectar a la base de datos

        // Hasheamos la contraseña con .then
        bcrypt.hash(password, 10)
        .then(hashPassword => {
            // Insertamos en la BBDD con el hash
            return sql`
                INSERT INTO users (usuario, password) 
                VALUES (${usuario}, ${hashPassword}) 
                RETURNING id
            `;
        })
        .then(([{ id }]) => {
            sql.end(); // cerramos conexión
            ok(id);    // resolvemos con el id
        })
        .catch( error => {
            sql.end(); // cerramos conexión también si hay error
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

//Función para buscar todas las reviews de un libro y las trae ordenadas de más reciente a más antigua
export function buscarReviews(id_libro){
    return new Promise((ok, ko) => {

        const sql = conectar();

        sql`SELECT * FROM reviews WHERE id_libro = ${id_libro} ORDER BY creada_en DESC`
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
export function buscarReviewsUsuario(id_usuario){
    return new Promise((ok, ko) => {
        const sql = conectar();

        sql`SELECT * FROM reviews WHERE id_usuario = ${id_usuario} ORDER BY creada_en DESC`
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



//Pruebas
/*
crearUsuario("jacinta", "123456")
.then(x => console.log(x))
.catch(x => console.log(x))
*/
/*
buscarUsuario("tomasa")
.then(x => console.log(x))
.catch(x => console.log(x))
*/
/*
crearLibro("libro uno", "autor cualquiera", "esto_es_una_url", "genero cualquiera", "1999-12-31", 800, "En un lugar de la Mancha, de cuyo nombre no quiero acordarme.....")
.then(x => console.log(x))
.catch(x => console.log(x))
*/
/*
buscarLibros()
.then(x => console.log(x))
.catch(x => console.log(x))
*/
/*
crearReview(5, 3, 1, "Ni tan mal")
.then(x => console.log(x))
.catch(x => console.log(x))
*/
/*
buscarReviews(1)
.then(x => console.log(x))
.catch(x => console.log(x))
*/