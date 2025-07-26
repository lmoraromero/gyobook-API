# Gyobook API ✏️📖

## 1. Introducción ✍️

Gyobook API es una API REST desarrollada para gestionar una plataforma de libros y reseñas. Permite a usuarios registrarse, iniciar sesión, crear fichas de libros con imágenes, y añadir reseñas valorativas y comentadas. Está diseñada para integrarse con un frontend que consume estos datos, ofreciendo una experiencia dinámica y segura. 

La API está construida con **Node.js**, **Express** y **PostgreSQL**.

---

## 2. Objetivos 🔍

- Crear un backend robusto y seguro para la gestión de usuarios, libros y reseñas.
- Implementar autenticación basada en tokens **JWT** para proteger rutas sensibles.
- Permitir la subida y almacenamiento de imágenes de portadas en la nube usando **Cloudinary**.
- Desarrollar endpoints REST claros y funcionales para operaciones CRUD básicas.
- Facilitar búsquedas por título, autor o género.
- Proporcionar respuestas claras con códigos HTTP adecuados para facilitar la gestión de errores en el frontend.

---

## 3. Tecnologías y herramientas utilizadas 🛠️

- ⚙️ **Node.js**: entorno de ejecución para JavaScript en el backend.  
- 🚂 **Express**: framework para gestionar rutas y middleware HTTP.  
- 🗄️ **PostgreSQL**: base de datos relacional para almacenar usuarios, libros y reseñas.  
- 🔐 **JSON Web Tokens (JWT)**: para autenticación y autorización de usuarios.  
- 🔒 **bcrypt**: para cifrado seguro de contraseñas.  
- 🗂️ + ☁️ **Multer + Cloudinary**: para la subida y almacenamiento de imágenes en la nube.  
- 🔧 **dotenv**: gestión de variables de entorno.  
- 🌐 **cors**: para permitir solicitudes entre dominios (frontend/backend).  


---

## 4. Endpoints principales 🚀

| Método | Ruta                      | Descripción                              | Autenticación |
|--------|---------------------------|----------------------------------------|--------------|
| POST   | /registro                 | Registrar un usuario (usuario, password) | No           |
| POST   | /login                    | Iniciar sesión (usuario, password)      | No           |
| GET    | /libros                   | Obtener lista de todos los libros        | No           |
| POST   | /libro/nuevo              | Crear ficha de libro con portada (imagen) | Sí           |
| GET    | /libro/:id                | Obtener libro por id                      | No           |
| POST   | /reviews/nueva            | Crear reseña de un libro                  | Sí           |
| GET    | /reviews/:id_libro        | Obtener reseñas de un libro               | No           |
| GET    | /reviews/usuario/:id_usuario | Obtener reseñas hechas por un usuario | No           |
| GET    | /busqueda?texto=          | Buscar libros por título, autor o género | No           |

---

## 5. Autenticación 🔐

Se utiliza JWT para proteger las rutas que requieren usuario autenticado.

El token se debe enviar en el header `Authorization` con formato:  
`Bearer <token>`

El token se genera al registrarse o iniciar sesión correctamente.

---

## 6. Manejo de imágenes 📷

- Las portadas se suben mediante **Multer** integrado con **Cloudinary**.  
- Las imágenes se almacenan en la nube (Cloudinary).  
- La URL pública generada se guarda en la base de datos y se devuelve al frontend para su uso.

---

## 7. Manejo de errores ⚠️

La API responde con códigos HTTP estándar para facilitar el manejo de errores en el frontend:

| Código | Significado                                |
|--------|-------------------------------------------|
| 400    | Petición inválida (campos faltantes)      |
| 401    | No autorizado (falta token)                |
| 403    | Prohibido (token inválido o contraseña incorrecta) |
| 404    | Recurso no encontrado                      |
| 422    | Datos con formato incorrecto               |
| 500    | Error interno del servidor                 |


---

## 8. Acceso al Frontend 🌐

Puedes acceder al frontend de Gyobook en la siguiente URL:

[https://gyobook.onrender.com/](https://gyobook.onrender.com/)

Repositorio GitHub del frontend:  
[https://github.com/lmoraromero/gyobook-front](https://github.com/lmoraromero/gyobook-front)

---

## 9. Contacto ✉️

Si quieres saber más sobre el proyecto o contactarme, puedes encontrarme en:

- [LinkedIn](www.linkedin.com/in/laura-mora-romero) : www.linkedin.com/in/laura-mora-romero
- [GitHub](https://github.com/lmoraromero)

---





