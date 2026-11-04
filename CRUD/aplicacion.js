// --- 1. ESTADO DE LA APLICACIÓN ---
let libros = JSON.parse(localStorage.getItem('listaLibros')) || [];
let estaEditando = false;
// --- 2. ELEMENTOS DEL DOM (CAPTURA DE CAMPOS) ---
const formulario = document.getElementById('formulario-crud');
const entradaTitulo = document.getElementById('titulo');
const entradaAutor = document.getElementById('autor');
const entradaId = document.getElementById('id-elemento');
const cuerpoTabla = document.getElementById('cuerpo-tabla');
const botonGuardar = document.getElementById('boton-guardar');
const botonCancelar = document.getElementById('boton-cancelar');
// --- 3. FUNCIONES OPERATIVAS (CRUD) ---
// [LEER] Mostrar los datos almacenados en la tabla HTML
function renderizarLibros() {
    cuerpoTabla.innerHTML = ''; // Vaciar la tabla antes de volver a dibujar

    if (libros.length === 0) {
        cuerpoTabla.innerHTML = `<tr><td colspan="3" style="text-align:center;">No hay
libros registrados.</td></tr>`;
        return;
    }
    libros.forEach(libro => {
        const fila = document.createElement('tr');
        fila.innerHTML = `
 <td>${libro.titulo}</td>
 <td>${libro.autor}</td>
 <td>
 <button class="btn-editar"
onclick="prepararEdicion('${libro.id}')">Editar</button>
 <button class="btn-eliminar"
onclick="eliminarLibro('${libro.id}')">Eliminar</button>
 </td>
 `;
        cuerpoTabla.appendChild(fila);
    });

    // Guardar el estado actual en el almacenamiento local del navegador
    localStorage.setItem('listaLibros', JSON.stringify(libros));
}
// [CREAR Y ACTUALIZAR] Escuchar el envío del formulario
formulario.addEventListener('submit', (evento) => {
    evento.preventDefault(); // Detener la recarga por defecto de la página
    const valorTitulo = entradaTitulo.value.trim();
    const valorAutor = entradaAutor.value.trim();
    const idActual = entradaId.value;
    if (estaEditando) {
        // [ACTUALIZAR] Mapear el arreglo y modificar el registro que coincida con el ID
        libros = libros.map(libro =>
            libro.id === idActual ? { ...libro, titulo: valorTitulo, autor: valorAutor } : libro
        );
        estaEditando = false;
        botonGuardar.textContent = 'Guardar Libro';
        botonCancelar.classList.add('oculto');
    } else {
        // [CREAR] Construir un nuevo objeto libro con un ID único robusto
        const nuevoLibro = {
            id: crypto.randomUUID(),
            titulo: valorTitulo,
            autor: valorAutor
        };
        libros.push(nuevoLibro);
    }
    reiniciarFormulario();
    renderizarLibros();
});
// [ACTUALIZAR - PREPARACIÓN] Cargar el registro seleccionado al formulario
window.prepararEdicion = function (id) {
    const libroEncontrado = libros.find(libro => libro.id === id);
    if (!libroEncontrado) return;
    entradaTitulo.value = libroEncontrado.titulo;
    entradaAutor.value = libroEncontrado.autor;
    entradaId.value = libroEncontrado.id;
    estaEditando = true;
    botonGuardar.textContent = 'Actualizar Libro';
    botonCancelar.classList.remove('oculto');
};
// [ELIMINAR] Quitar un registro del arreglo
window.eliminarLibro = function (id) {
    if (confirm('¿Está seguro de que desea eliminar este libro?')) {
        libros = libros.filter(libro => libro.id !== id);

        // Si borramos el libro que se estaba editando en ese instante, limpiamos el
        formulario
        if (estaEditando && entradaId.value === id) {
            reiniciarFormulario();
        }

        renderizarLibros();
    }
};
// Cancelar el estado de edición de forma explícita
botonCancelar.addEventListener('click', reiniciarFormulario);
function reiniciarFormulario() {
    formulario.reset();
    entradaId.value = '';
    estaEditando = false;
    botonGuardar.textContent = 'Guardar Libro';
    botonCancelar.classList.add('oculto');
}
// --- 4. INICIALIZACIÓN DE LA APLICACIÓN ---
renderizarLibros();