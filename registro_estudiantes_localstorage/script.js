"use strict";

/*1. Expresiones regulares y mensajes de error*/
const REGEX = {
  cedula: /^\d{10}$/,
  apellidos: /^[A-Za-zÁÉÍÓÚÜÑáéíóúüñ]{2,}( [A-Za-zÁÉÍÓÚÜÑáéíóúüñ]{2,}){0,2}$/,
  nombres: /^[A-Za-zÁÉÍÓÚÜÑáéíóúüñ]{2,}( [A-Za-zÁÉÍÓÚÜÑáéíóúüñ]{2,}){0,2}$/,
  direccion: /^[A-Za-z0-9ÁÉÍÓÚÜÑáéíóúüñ .,#\-]{5,80}$/,
  telefono: /^(09\d{8}|0[2-7]\d{7})$/,
  correo: /^[A-Za-z0-9._%+\-]+@[A-Za-z0-9.\-]+\.[A-Za-z]{2,}$/,
  facultad: /^[A-Za-zÁÉÍÓÚÜÑáéíóúüñ ,]{5,60}$/,
  nivel: /^([1-9]|10)$/,
  paralelo: /^[A-Za-z]$/
};

const MENSAJES = {
  cedula: "La cédula debe tener exactamente 10 dígitos numéricos.",
  apellidos: "Ingresa de 1 a 3 apellidos, solo con letras (mínimo 2 letras cada uno).",
  nombres: "Ingresa de 1 a 3 nombres, solo con letras (mínimo 2 letras cada uno).",
  direccion: "La dirección debe tener entre 5 y 80 caracteres (letras, números, espacios y . , # -).",
  telefono: "Ingresa un celular de 10 dígitos que empiece con 09, o un teléfono convencional de 9 dígitos.",
  correo: "Ingresa un correo válido, por ejemplo nombre@correo.com.",
  facultad: "La facultad debe tener entre 5 y 60 letras.",
  nivel: "Selecciona un nivel.",
  paralelo: "El paralelo debe ser una sola letra (por ejemplo, A)."
};

const CAMPOS = Object.keys(REGEX);
const CLAVE = "estudiantes";
const form = document.getElementById("formEstudiante");

/*2. Validación de campos*/
function mostrarError(id, texto) {
  const input = document.getElementById(id);
  document.getElementById("error-" + id).textContent = texto;
  input.classList.toggle("invalido", texto !== "");
  input.setAttribute("aria-invalid", texto !== "" ? "true" : "false");
  input.setAttribute("aria-describedby", "error-" + id);
}

function validarCampo(id) {
  const valor = document.getElementById(id).value.trim();
  let texto = "";
  if (valor === "") texto = "Este campo es obligatorio.";
  else if (!REGEX[id].test(valor)) texto = MENSAJES[id];
  mostrarError(id, texto);
  return texto === "";
}

function mostrarMensaje(texto, correcto) {
  const m = document.getElementById("mensaje");
  m.textContent = texto;
  m.className = correcto ? "ok" : "fallo";
  m.hidden = false;
}

/*3. Almacenamiento local con JSON y localStorage*/
function cargarEstudiantes() {
  try {
    const datos = JSON.parse(localStorage.getItem(CLAVE));
    return Array.isArray(datos) ? datos : [];
  } catch (error) {
    return [];
  }
}

function guardarEstudiantes(lista) {
  localStorage.setItem(CLAVE, JSON.stringify(lista));
}

/*4. Mostrar la tabla y el JSON*/
function mostrarEstudiantes() {
  const lista = cargarEstudiantes();
  const tbody = document.getElementById("tbodyEstudiantes");
  tbody.innerHTML = "";

  if (lista.length === 0) {
    const fila = tbody.insertRow();
    const celda = fila.insertCell();
    celda.colSpan = 10;
    celda.className = "vacio";
    celda.textContent = "Aún no hay estudiantes registrados.";
  }

  lista.forEach((est) => {
    const fila = tbody.insertRow();
    CAMPOS.forEach((campo) => { fila.insertCell().textContent = est[campo]; });
    const boton = document.createElement("button");
    boton.type = "button";
    boton.className = "btn btn-eliminar";
    boton.textContent = "Eliminar";
    boton.dataset.cedula = est.cedula;
    boton.setAttribute("aria-label", "Eliminar al estudiante con cédula " + est.cedula);
    fila.insertCell().appendChild(boton);
  });

  document.getElementById("jsonAlmacenado").textContent = JSON.stringify(lista, null, 2);
}

/*5. Eventos*/
form.addEventListener("submit", (e) => {
  e.preventDefault();
  const validos = CAMPOS.map(validarCampo);
  if (validos.includes(false)) {
    mostrarMensaje("Revisa los campos marcados en rojo.", false);
    form.querySelector('[aria-invalid="true"]').focus();
    return;
  }

  const estudiante = {};
  CAMPOS.forEach((id) => { estudiante[id] = document.getElementById(id).value.trim(); });
  estudiante.paralelo = estudiante.paralelo.toUpperCase();

  const lista = cargarEstudiantes();
  if (lista.some((est) => est.cedula === estudiante.cedula)) {
    mostrarError("cedula", "Ya existe un estudiante registrado con esa cédula.");
    mostrarMensaje("No se registró: la cédula ya existe.", false);
    document.getElementById("cedula").focus();
    return;
  }

  try {
    lista.push(estudiante);
    guardarEstudiantes(lista);
  } catch (error) {
    mostrarMensaje("No se pudo guardar en el almacenamiento local.", false);
    return;
  }
  form.reset();
  mostrarMensaje("Estudiante registrado correctamente.", true);
  mostrarEstudiantes();
});

// Valida cada campo al salir de él
form.addEventListener("focusout", (e) => {
  if (CAMPOS.includes(e.target.id)) validarCampo(e.target.id);
});

// Al limpiar, se borran los errores y el mensaje
form.addEventListener("reset", () => {
  setTimeout(() => {
    CAMPOS.forEach((id) => mostrarError(id, ""));
    document.getElementById("mensaje").hidden = true;
  }, 0);
});

// Eliminar un estudiante
document.getElementById("tbodyEstudiantes").addEventListener("click", (e) => {
  const cedula = e.target.dataset.cedula;
  if (!cedula) return;
  guardarEstudiantes(cargarEstudiantes().filter((est) => est.cedula !== cedula));
  mostrarEstudiantes();
});

// Vaciar todos los registros
document.getElementById("btnVaciar").addEventListener("click", () => {
  if (confirm("¿Seguro que deseas eliminar todos los registros?")) {
    localStorage.removeItem(CLAVE);
    mostrarEstudiantes();
  }
});

/*6. Inicio*/
mostrarEstudiantes();
