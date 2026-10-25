"use strict";

//nota para mi: esto aun no guarda nada, si lo refresco se borra todo

/*  1. DATOS SIMULADOS  */

const CLAVE_DEMO = "uleam2026";
const RECARGO_EXTRA = 1.5; // hora extra = valor hora x 1,5

// Horario y valor por hora según el cargo (rol)
const ROLES = {
  docente:        { nombre: "Docente",         entrada: "08:00", salida: "16:00", valorHora: 10.0 },
  administrativo: { nombre: "Administrativo",  entrada: "08:00", salida: "17:00", valorHora: 6.5 },
  limpieza:       { nombre: "Limpieza",        entrada: "06:00", salida: "14:00", valorHora: 4.5 },
  talento_humano: { nombre: "Talento Humano",  entrada: "08:00", salida: "17:00", valorHora: 7.0 }
};

const empleados = [
  { id: 1,  nombre: "María González",   area: "Docencia",           rol: "docente",        usuario: "mgonzalez" },
  { id: 2,  nombre: "Carlos Mendoza",   area: "Administración",     rol: "administrativo", usuario: "cmendoza" },
  { id: 3,  nombre: "Ana Rodríguez",    area: "Finanzas",           rol: "administrativo", usuario: "arodriguez" },
  { id: 4,  nombre: "Luis Pérez",       area: "Tecnología",         rol: "administrativo", usuario: "lperez" },
  { id: 5,  nombre: "Sofía Zambrano",   area: "Docencia",           rol: "docente",        usuario: "szambrano" },
  { id: 6,  nombre: "Diego Andrade",    area: "Talento Humano",     rol: "talento_humano", usuario: "dandrade" },
  { id: 7,  nombre: "Valentina López",  area: "Administración",     rol: "administrativo", usuario: "vlopez" },
  { id: 8,  nombre: "José Cedeño",      area: "Servicios generales", rol: "limpieza",      usuario: "jcedeno" },
  { id: 9,  nombre: "Camila Torres",    area: "Finanzas",           rol: "administrativo", usuario: "ctorres" },
  { id: 10, nombre: "Andrés Vera",      area: "Tecnología",         rol: "administrativo", usuario: "avera" },
  { id: 11, nombre: "Rosa Macías",      area: "Servicios generales", rol: "limpieza",      usuario: "rmacias" }
];

// Estado en memoria
const registros = {};        // clave "idEmpleado|YYYY-MM-DD" -> { empId, fecha, entrada, salida }
const justificaciones = {};  // clave "idEmpleado|YYYY-MM-DD" -> { motivo, detalle, tipo }
let usuarioActual = null;
let relojTimer = null;

/*  2. UTILIDADES  */

const $ = (id) => document.getElementById(id);
const pad = (n) => String(n).padStart(2, "0");
const clave = (empId, iso) => empId + "|" + iso;

function fechaISO(d) {
  return d.getFullYear() + "-" + pad(d.getMonth() + 1) + "-" + pad(d.getDate());
}
function hoyISO() { return fechaISO(new Date()); }
function parseISO(iso) {
  const [y, m, d] = iso.split("-").map(Number);
  return new Date(y, m - 1, d);
}
function esLaborable(iso) {
  const dia = parseISO(iso).getDay();
  return dia !== 0 && dia !== 6;
}
function horaActual() {
  const d = new Date();
  return pad(d.getHours()) + ":" + pad(d.getMinutes());
}
function aMin(hhmm) {
  const [h, m] = hhmm.split(":").map(Number);
  return h * 60 + m;
}
function aHHMM(min) { return pad(Math.floor(min / 60)) + ":" + pad(min % 60); }

function formatoFecha(iso) {
  const meses = ["ene", "feb", "mar", "abr", "may", "jun", "jul", "ago", "sep", "oct", "nov", "dic"];
  const d = parseISO(iso);
  return d.getDate() + " " + meses[d.getMonth()] + " " + d.getFullYear();
}
function fmtDuracion(min) {
  if (min <= 0) return "—";
  return Math.floor(min / 60) + " h " + pad(min % 60) + " min";
}
function fmtDinero(n) { return "$" + n.toFixed(2); }
function mayuscula(t) { return t.charAt(0).toUpperCase() + t.slice(1); }
function normalizar(t) { return t.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase(); }
function esc(t) {
  return String(t).replace(/[&<>"']/g, (c) =>
    ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
}

// Recorre cada día entre dos fechas ISO (ambas incluidas)
function recorrerDias(inicioISO, finISO, fn) {
  const d = parseISO(inicioISO);
  const fin = parseISO(finISO);
  while (d <= fin) {
    fn(fechaISO(d));
    d.setDate(d.getDate() + 1);
  }
}

// Muestra u oculta el error de un campo. Devuelve true si el campo es válido.
function setError(input, spanError, mensaje) {
  spanError.textContent = mensaje;
  input.classList.toggle("invalido", mensaje !== "");
  input.setAttribute("aria-invalid", mensaje !== "" ? "true" : "false");
  const base = input.dataset.desc ? input.dataset.desc + " " : "";
  if (spanError.id) input.setAttribute("aria-describedby", base + spanError.id);
  return mensaje === "";
}
// Lleva el foco al primer campo con error
function enfocarPrimerError(form) {
  const el = form.querySelector('[aria-invalid="true"]');
  if (el) el.focus();
}
// Marca los campos de un rango de fechas con error
function marcarRango(idIni, idFin, idErr, msg, inicio, fin) {
  $(idErr).textContent = msg;
  const malIni = msg !== "" && (!inicio || (fin && inicio > fin));
  const malFin = msg !== "" && (!fin || (inicio && inicio > fin));
  [[idIni, malIni], [idFin, malFin]].forEach(([id, mal]) => {
    const el = $(id);
    el.classList.toggle("invalido", mal);
    el.setAttribute("aria-invalid", mal ? "true" : "false");
    el.setAttribute("aria-describedby", idErr);
  });
}
function mostrarMsg(el, texto, tipo) {
  el.textContent = texto;
  el.className = "alerta " + (tipo === "ok" ? "alerta-ok" : "alerta-error");
  el.hidden = false;
}
function ocultarMsg(el) { el.hidden = true; }

/*  3. LÓGICA DE ASISTENCIA  */

function estadoDe(emp, iso) {
  const reg = registros[clave(emp.id, iso)];
  const hoy = hoyISO();
  if (reg) {
    return aMin(reg.entrada) > aMin(ROLES[emp.rol].entrada) ? "Atrasado" : "A tiempo";
  }
  if (iso > hoy) return "Pendiente";
  if (!esLaborable(iso)) return "No laborable";
  if (iso === hoy) return "Sin registro";
  return "Falta";
}
function minutosTrabajados(reg) {
  return reg && reg.salida ? Math.max(0, aMin(reg.salida) - aMin(reg.entrada)) : 0;
}
function minutosExtra(emp, reg) {
  return reg && reg.salida ? Math.max(0, aMin(reg.salida) - aMin(ROLES[emp.rol].salida)) : 0;
}
function badge(estado) {
  const clases = { "A tiempo": "b-ok", "Atrasado": "b-warn", "Falta": "b-bad" };
  return '<span class="badge ' + (clases[estado] || "b-gris") + '">' + estado + "</span>";
}
function justAprobada(k) {
  const j = justificaciones[k];
  return !!j && j.estado === "Aprobada";
}
function notaJustificacion(emp, iso) {
  const j = justificaciones[clave(emp.id, iso)];
  if (!j) return "";
  let texto;
  if (j.estado === "Aprobada") texto = "Justificado: " + j.motivo;
  else if (j.estado === "Pendiente") texto = "Justificación pendiente de revisión";
  else texto = "Justificación rechazada" + (j.comentario ? ": " + j.comentario : "");
  return '<span class="nota-just">' + esc(texto) + "</span>";
}

// Genera datos de ejemplo para los últimos 40 días (determinista)
function generarDatosIniciales() {
  const hoy = new Date();
  hoy.setHours(0, 0, 0, 0);

  empleados.forEach((emp) => {
    let semilla = emp.id * 7919;
    const rand = () => {
      semilla = (semilla * 1664525 + 1013904223) % 4294967296;
      return semilla / 4294967296;
    };
    const h = ROLES[emp.rol];

    for (let i = 1; i <= 40; i++) {
      const d = new Date(hoy);
      d.setDate(d.getDate() - i);
      const iso = fechaISO(d);
      if (!esLaborable(iso)) continue;

      const r = rand();
      if (r < 0.10) continue; // falta

      let entrada;
      if (r < 0.30) entrada = aMin(h.entrada) + 1 + Math.floor(rand() * 25); // atrasado
      else entrada = aMin(h.entrada) - Math.floor(rand() * 25);              // a tiempo

      let salida;
      if (rand() < 0.25) salida = aMin(h.salida) + 20 + Math.floor(rand() * 130); // con horas extra
      else salida = aMin(h.salida) - Math.floor(rand() * 8);

      registros[clave(emp.id, iso)] = { empId: emp.id, fecha: iso, entrada: aHHMM(entrada), salida: aHHMM(salida) };
    }
  });

  // Hoy: algunos empleados ya marcaron entrada (los usuarios de prueba 1, 2 y 8 quedan libres para probar)
  const hoyIso = fechaISO(hoy);
  if (esLaborable(hoyIso)) {
    const marcados = { 3: "07:52", 4: "08:11", 5: "07:48", 6: "07:55", 7: "08:06", 9: "07:44", 10: "07:58", 11: "05:50" };
    Object.keys(marcados).forEach((id) => {
      registros[clave(Number(id), hoyIso)] = { empId: Number(id), fecha: hoyIso, entrada: marcados[id], salida: null };
    });
  }
}

// Dos justificaciones de ejemplo, pendientes de revisar
function sembrarJustificaciones() {
  const casos = [
    { id: 3, motivo: "Enfermedad / cita médica", detalle: "Cita médica programada en el IESS durante la mañana." },
    { id: 5, motivo: "Problema de transporte",   detalle: "Hubo un cierre vial por obras y no pude llegar a tiempo." }
  ];
  casos.forEach((c) => {
    const emp = empleados.find((e) => e.id === c.id);
    for (let i = 1; i <= 15; i++) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const iso = fechaISO(d);
      const est = estadoDe(emp, iso);
      if (est === "Atrasado" || est === "Falta") {
        justificaciones[clave(emp.id, iso)] = {
          motivo: c.motivo, detalle: c.detalle, tipo: est, origen: "empleado",
          estado: "Pendiente", adjunto: null, comentario: "", enviada: hoyISO()
        };
        break;
      }
    }
  });
}

/*  4. NAVEGACIÓN ENTRE VISTAS  */

function mostrarVista(idVista) {
  document.querySelectorAll(".vista").forEach((v) => { v.hidden = v.id !== idVista; });
  window.scrollTo(0, 0);
}

function cerrarSesion() {
  usuarioActual = null;
  clearInterval(relojTimer);
  relojTimer = null;
  $("formLogin").reset();
  setError($("usuario"), $("errUsuario"), "");
  setError($("clave"), $("errClave"), "");
  ocultarMsg($("errLogin"));
  mostrarVista("vistaLogin");
}

/*  5. LOGIN  */

$("formLogin").addEventListener("submit", (e) => {
  e.preventDefault();
  const usuario = $("usuario").value.trim().toLowerCase();
  const pass = $("clave").value;

  const okU = setError($("usuario"), $("errUsuario"), usuario === "" ? "Ingresa tu usuario." : "");
  const okP = setError($("clave"), $("errClave"), pass === "" ? "Ingresa tu contraseña." : "");
  ocultarMsg($("errLogin"));
  if (!okU || !okP) { enfocarPrimerError($("formLogin")); return; }

  const emp = empleados.find((x) => x.usuario === usuario);
  if (!emp || pass !== CLAVE_DEMO) {
    mostrarMsg($("errLogin"), "Usuario o contraseña incorrectos.", "error");
    return;
  }

  usuarioActual = emp;
  $("formLogin").reset();
  // Redirección según el rol
  if (emp.rol === "talento_humano") abrirAdmin();
  else abrirEmpleado();
});

["usuario", "clave"].forEach((id) => {
  $(id).addEventListener("input", () => {
    setError($(id), $(id === "usuario" ? "errUsuario" : "errClave"), "");
    ocultarMsg($("errLogin"));
  });
});

/*6. VISTA EMPLEADO  */

function abrirEmpleado() {
  const emp = usuarioActual;
  const r = ROLES[emp.rol];
  mostrarVista("vistaEmpleado");

  $("empAvatar").textContent = emp.nombre.charAt(0);
  $("empNombre").textContent = emp.nombre;
  $("empRol").textContent = r.nombre;
  $("horarioEmp").textContent = r.entrada + " – " + r.salida;

  $("manFecha").max = hoyISO();
  $("manFecha").value = hoyISO();
  ocultarMsg($("msgMarcacion"));
  ocultarMsg($("msgManual"));
  ocultarMsg($("msgJustEmp"));

  actualizarReloj();
  clearInterval(relojTimer);
  relojTimer = setInterval(actualizarReloj, 1000);
  renderEmpleado();
}

function actualizarReloj() {
  const d = new Date();
  $("relojActual").textContent = pad(d.getHours()) + ":" + pad(d.getMinutes()) + ":" + pad(d.getSeconds());
  $("fechaActual").textContent = mayuscula(
    d.toLocaleDateString("es-EC", { weekday: "long", day: "numeric", month: "long", year: "numeric" })
  );
}

function renderEmpleado() {
  const emp = usuarioActual;
  const hoy = hoyISO();
  const reg = registros[clave(emp.id, hoy)];

  $("hoyEntrada").textContent = reg ? reg.entrada : "—";
  $("hoySalida").textContent = reg && reg.salida ? reg.salida : "—";
  $("hoyEstado").textContent = estadoDe(emp, hoy);

  // Últimos 10 días laborables (más hoy si tiene registro)
  const dias = [];
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  while (dias.length < 10) {
    const iso = fechaISO(d);
    if (esLaborable(iso) || registros[clave(emp.id, iso)]) dias.push(iso);
    d.setDate(d.getDate() - 1);
  }

  $("tbodyHistorial").innerHTML = dias.map((iso) => {
    const r = registros[clave(emp.id, iso)];
    const est = estadoDe(emp, iso);
    return "<tr>" +
      "<td>" + formatoFecha(iso) + "</td>" +
      "<td>" + (r ? r.entrada : "—") + "</td>" +
      "<td>" + (r && r.salida ? r.salida : "—") + "</td>" +
      "<td>" + fmtDuracion(minutosTrabajados(r)) + "</td>" +
      "<td>" + fmtDuracion(minutosExtra(emp, r)) + "</td>" +
      "<td>" + badge(est) + notaJustificacion(emp, iso) + "</td>" +
      "<td>" + accionEmpleado(emp, iso, est) + "</td>" +
      "</tr>";
  }).join("");
}

// Botón de la columna "Acción" del historial del empleado
function accionEmpleado(emp, iso, est) {
  if (est !== "Atrasado" && est !== "Falta") return '<span class="muted">—</span>';
  const j = justificaciones[clave(emp.id, iso)];
  if (!j || j.estado === "Rechazada") {
    return '<button type="button" class="btn btn-secundario btn-chico" data-envj="' + iso + '">' +
      (j ? "Justificar de nuevo" : "Justificar") + "</button>";
  }
  return '<span class="muted">' + (j.estado === "Pendiente" ? "En revisión" : "Justificado") + "</span>";
}

// Marcar entrada con la hora actual
$("btnEntrada").addEventListener("click", () => {
  const emp = usuarioActual;
  const hoy = hoyISO();
  const k = clave(emp.id, hoy);
  const msg = $("msgMarcacion");

  if (registros[k]) {
    mostrarMsg(msg, "Ya registraste tu entrada hoy a las " + registros[k].entrada + ".", "error");
    return;
  }
  registros[k] = { empId: emp.id, fecha: hoy, entrada: horaActual(), salida: null };
  const tarde = aMin(registros[k].entrada) > aMin(ROLES[emp.rol].entrada);
  mostrarMsg(msg, "Entrada registrada a las " + registros[k].entrada + (tarde ? " (atrasado)." : " (a tiempo)."), "ok");
  renderEmpleado();
});

// Marcar salida con la hora actual
$("btnSalida").addEventListener("click", () => {
  const emp = usuarioActual;
  const reg = registros[clave(emp.id, hoyISO())];
  const msg = $("msgMarcacion");

  if (!reg) {
    mostrarMsg(msg, "Primero debes marcar tu entrada.", "error");
    return;
  }
  if (reg.salida) {
    mostrarMsg(msg, "Ya registraste tu salida hoy a las " + reg.salida + ".", "error");
    return;
  }
  if (aMin(horaActual()) <= aMin(reg.entrada)) {
    mostrarMsg(msg, "La salida debe ser posterior a la hora de entrada (" + reg.entrada + ").", "error");
    return;
  }
  reg.salida = horaActual();
  const extra = minutosExtra(emp, reg);
  mostrarMsg(msg, "Salida registrada a las " + reg.salida + (extra > 0 ? ". Horas extra: " + fmtDuracion(extra) + "." : "."), "ok");
  renderEmpleado();
});

// Registro manual con validaciones
$("formManual").addEventListener("submit", (e) => {
  e.preventDefault();
  const emp = usuarioActual;
  const hoy = hoyISO();
  const fecha = $("manFecha").value;
  const ent = $("manEntrada").value;
  const sal = $("manSalida").value;

  let msgFecha = "";
  if (!fecha) msgFecha = "Selecciona la fecha.";
  else if (fecha > hoy) msgFecha = "No puedes registrar una fecha futura.";
  else if (registros[clave(emp.id, fecha)]) msgFecha = "Ya existe un registro para esa fecha.";

  let msgEnt = "";
  if (!ent) msgEnt = "Ingresa la hora de entrada.";
  else if (fecha === hoy && ent > horaActual()) msgEnt = "La hora de entrada no puede ser futura.";

  let msgSal = "";
  if (sal) {
    if (ent && sal <= ent) msgSal = "La salida debe ser posterior a la entrada.";
    else if (fecha === hoy && sal > horaActual()) msgSal = "La hora de salida no puede ser futura.";
  }

  const ok1 = setError($("manFecha"), $("errManFecha"), msgFecha);
  const ok2 = setError($("manEntrada"), $("errManEntrada"), msgEnt);
  const ok3 = setError($("manSalida"), $("errManSalida"), msgSal);
  if (!(ok1 && ok2 && ok3)) {
    mostrarMsg($("msgManual"), "Revisa los campos marcados en rojo.", "error");
    enfocarPrimerError($("formManual"));
    return;
  }

  registros[clave(emp.id, fecha)] = { empId: emp.id, fecha: fecha, entrada: ent, salida: sal || null };
  mostrarMsg($("msgManual"), "Registro guardado para el " + formatoFecha(fecha) + ".", "ok");
  $("manEntrada").value = "";
  $("manSalida").value = "";
  renderEmpleado();
});

["manFecha", "manEntrada", "manSalida"].forEach((id) => {
  $(id).addEventListener("input", () => {
    setError($(id), $("err" + id.charAt(0).toUpperCase() + id.slice(1)), "");
  });
});

$("btnSalirEmp").addEventListener("click", cerrarSesion);

/*6.1 El empleado envía su justificación*/

const dlgEnv = $("dlgEnviarJust");
const formEnv = $("formEnviarJust");
const EXT_PERMITIDAS = ["pdf", "jpg", "jpeg", "png"];
const TIPOS_PERMITIDOS = ["application/pdf", "image/jpeg", "image/png"];
const MAX_ADJUNTO = 2 * 1024 * 1024; // 2 MB

function validarAdjunto(archivo) {
  if (!archivo) return ""; // es opcional
  const ext = archivo.name.split(".").pop().toLowerCase();
  if (!EXT_PERMITIDAS.includes(ext) && !TIPOS_PERMITIDOS.includes(archivo.type)) {
    return "Formato no permitido. Usa PDF, JPG o PNG.";
  }
  if (archivo.size > MAX_ADJUNTO) return "El archivo supera los 2 MB.";
  return "";
}

// Delegación: clic en "Justificar" dentro del historial
$("tbodyHistorial").addEventListener("click", (e) => {
  const btn = e.target.closest("[data-envj]");
  if (btn) abrirEnvioJust(btn.dataset.envj);
});

function abrirEnvioJust(iso) {
  const emp = usuarioActual;
  formEnv.dataset.fecha = iso;
  $("ejFecha").value = formatoFecha(iso);
  $("ejTipo").value = estadoDe(emp, iso);
  $("ejMotivo").value = "";
  $("ejDetalle").value = "";
  $("ejAdjunto").value = "";
  $("ejContador").textContent = "0/200";
  setError($("ejMotivo"), $("errEjMotivo"), "");
  setError($("ejDetalle"), $("errEjDetalle"), "");
  setError($("ejAdjunto"), $("errEjAdjunto"), "");
  dlgEnv.showModal();
}

$("ejDetalle").addEventListener("input", () => {
  $("ejContador").textContent = $("ejDetalle").value.length + "/200";
  setError($("ejDetalle"), $("errEjDetalle"), "");
});
$("ejMotivo").addEventListener("change", () => setError($("ejMotivo"), $("errEjMotivo"), ""));
$("ejAdjunto").addEventListener("change", () => {
  const archivo = $("ejAdjunto").files && $("ejAdjunto").files[0];
  setError($("ejAdjunto"), $("errEjAdjunto"), validarAdjunto(archivo));
});
$("btnCancelarEnvio").addEventListener("click", () => dlgEnv.close());

formEnv.addEventListener("submit", (e) => {
  e.preventDefault();
  const emp = usuarioActual;
  const iso = formEnv.dataset.fecha;
  const k = clave(emp.id, iso);
  const motivo = $("ejMotivo").value;
  const detalle = $("ejDetalle").value.trim();
  const archivo = $("ejAdjunto").files && $("ejAdjunto").files[0];

  const ok1 = setError($("ejMotivo"), $("errEjMotivo"), motivo === "" ? "Selecciona un motivo." : "");
  let msgDet = "";
  if (detalle === "") msgDet = "Describe la justificación.";
  else if (detalle.length < 10) msgDet = "Escribe al menos 10 caracteres.";
  const ok2 = setError($("ejDetalle"), $("errEjDetalle"), msgDet);
  const ok3 = setError($("ejAdjunto"), $("errEjAdjunto"), validarAdjunto(archivo));
  if (!(ok1 && ok2 && ok3)) { enfocarPrimerError(formEnv); return; }

  // La novedad debe existir y no tener ya una justificación vigente
  const est = estadoDe(emp, iso);
  const previa = justificaciones[k];
  if ((est !== "Atrasado" && est !== "Falta") || (previa && previa.estado !== "Rechazada")) {
    dlgEnv.close();
    mostrarMsg($("msgJustEmp"), "Esta novedad ya no admite una justificación nueva.", "error");
    renderEmpleado();
    return;
  }

  justificaciones[k] = {
    motivo: motivo, detalle: detalle, tipo: est, origen: "empleado", estado: "Pendiente",
    adjunto: archivo ? archivo.name : null, comentario: "", enviada: hoyISO()
  };
  dlgEnv.close();
  mostrarMsg($("msgJustEmp"), "Justificación del " + formatoFecha(iso) + " enviada. Talento Humano la revisará.", "ok");
  renderEmpleado();
  $("msgJustEmp").tabIndex = -1;
  $("msgJustEmp").focus();
});

/*6.2 Descarga del formato en PDF*/

function datosFormato(extra) {
  const emp = usuarioActual;
  const r = ROLES[emp.rol];
  return Object.assign({
    nombre: emp.nombre, usuario: emp.usuario, area: emp.area, cargo: r.nombre,
    horario: r.entrada + " – " + r.salida,
    tipo: "", fecha: "", entradaReg: "", motivo: "", detalle: ""
  }, extra || {});
}

function descargarPDF(bytes, nombreArchivo) {
  const blob = new Blob([bytes], { type: "application/pdf" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = nombreArchivo;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

// Desde la ventana: usa lo que el empleado ya escribió
$("btnPdfJust").addEventListener("click", () => {
  const emp = usuarioActual;
  const iso = formEnv.dataset.fecha;
  const reg = registros[clave(emp.id, iso)];
  const bytes = generarPDFJustificacion(datosFormato({
    tipo: $("ejTipo").value,
    fecha: formatoFecha(iso),
    entradaReg: reg ? reg.entrada : "Sin registro",
    motivo: $("ejMotivo").value,
    detalle: $("ejDetalle").value.trim()
  }));
  descargarPDF(bytes, "Justificacion_" + emp.usuario + "_" + iso + ".pdf");
});

// Desde la tarjeta: con los datos del empleado y la novedad sin llenar
$("btnPdfBlanco").addEventListener("click", () => {
  const bytes = generarPDFJustificacion(datosFormato());
  descargarPDF(bytes, "Formato_justificacion_" + usuarioActual.usuario + ".pdf");
  mostrarMsg($("msgJustEmp"), "Formato descargado. Llénalo, fírmalo y entrégalo en Secretaría.", "ok");
});

/*7. VISTA ADMINISTRACIÓN (TALENTO HUMANO)*/

function llenarAreas(select, textoTodas) {
  const areas = [...new Set(empleados.map((e) => e.area))].sort();
  select.innerHTML = '<option value="">' + textoTodas + "</option>" +
    areas.map((a) => '<option value="' + esc(a) + '">' + esc(a) + "</option>").join("");
}

function rangoPorDefecto() {
  const fin = new Date();
  const ini = new Date();
  ini.setDate(ini.getDate() - 29);
  return { inicio: fechaISO(ini), fin: fechaISO(fin) };
}

function abrirAdmin() {
  mostrarVista("vistaAdmin");
  $("adminNombre").textContent = usuarioActual.nombre;

  $("fFecha").value = hoyISO();
  $("fNombre").value = "";
  llenarAreas($("fArea"), "Todas las áreas");
  llenarAreas($("rArea"), "Todos los departamentos");
  llenarAreas($("eArea"), "Todos los departamentos");

  const r = rangoPorDefecto();
  $("rInicio").value = r.inicio; $("rFin").value = r.fin;
  $("eInicio").value = r.inicio; $("eFin").value = r.fin;
  ocultarMsg($("msgAdmin"));

  mostrarSeccion("asistencia");
}

function mostrarSeccion(nombre) {
  ["asistencia", "reportes", "extras"].forEach((s) => {
    $("sec" + mayuscula(s)).hidden = s !== nombre;
  });
  document.querySelectorAll(".nav-btn").forEach((b) => {
    b.classList.toggle("activo", b.dataset.sec === nombre);
  });
  if (nombre === "asistencia") renderAsistencia();
  if (nombre === "reportes") renderReporte();
  if (nombre === "extras") renderExtras();
}

document.querySelectorAll(".nav-btn").forEach((b) => {
  b.addEventListener("click", () => mostrarSeccion(b.dataset.sec));
});
$("btnSalirAdmin").addEventListener("click", cerrarSesion);

/*7.1 Asistencia del día + justificaciones*/

function renderAsistencia() {
  renderPendientes();
  const iso = $("fFecha").value;
  const tbody = $("tbodyAdmin");

  if (!iso) {
    $("errFecha").textContent = "Selecciona una fecha para ver la asistencia.";
    tbody.innerHTML = '<tr><td class="vacio" colspan="6">Sin fecha seleccionada.</td></tr>';
    $("resumenAsistencia").innerHTML = "";
    return;
  }
  $("errFecha").textContent = "";

  const area = $("fArea").value;
  const q = normalizar($("fNombre").value.trim());
  const lista = empleados.filter((e) =>
    (area === "" || e.area === area) && (q === "" || normalizar(e.nombre).includes(q)));

  const cont = { "A tiempo": 0, "Atrasado": 0, "Falta": 0, "Sin registro": 0, justificados: 0 };

  const filas = lista.map((emp) => {
    const est = estadoDe(emp, iso);
    const reg = registros[clave(emp.id, iso)];
    const just = justificaciones[clave(emp.id, iso)];
    if (cont[est] !== undefined) cont[est]++;
    if (just && just.estado === "Aprobada") cont.justificados++;

    let accion = '<span class="muted">—</span>';
    if ((est === "Atrasado" || est === "Falta") && !just) {
      accion = '<button type="button" class="btn btn-secundario btn-chico" data-just="' + emp.id + '">Justificar</button>';
    } else if (just && just.estado === "Pendiente") {
      accion = '<button type="button" class="btn btn-primario btn-chico" data-rev="' + emp.id + '" data-fecha="' + iso + '">Revisar</button>';
    } else if (just && just.estado === "Aprobada") {
      accion = '<span class="muted">Justificado</span>';
    } else if (just && just.estado === "Rechazada") {
      accion = '<span class="muted">Rechazada</span>';
    }

    return "<tr>" +
      "<td>" + esc(emp.nombre) + "</td>" +
      "<td>" + esc(emp.area) + "</td>" +
      "<td>" + (reg ? reg.entrada : "—") + "</td>" +
      "<td>" + (reg && reg.salida ? reg.salida : "—") + "</td>" +
      "<td>" + badge(est) + notaJustificacion(emp, iso) + "</td>" +
      "<td>" + accion + "</td></tr>";
  });

  tbody.innerHTML = filas.length
    ? filas.join("")
    : '<tr><td class="vacio" colspan="6">No se encontraron empleados con esos filtros.</td></tr>';

  let chips = '<span class="chip"><strong>' + lista.length + "</strong> empleados</span>" +
    '<span class="chip"><strong>' + cont["A tiempo"] + "</strong> a tiempo</span>" +
    '<span class="chip"><strong>' + cont["Atrasado"] + "</strong> atrasados</span>" +
    '<span class="chip"><strong>' + cont["Falta"] + "</strong> faltas</span>";
  if (cont["Sin registro"] > 0) chips += '<span class="chip"><strong>' + cont["Sin registro"] + "</strong> sin registro aún</span>";
  chips += '<span class="chip"><strong>' + cont.justificados + "</strong> justificados</span>";
  $("resumenAsistencia").innerHTML = chips;
}

["fFecha", "fArea"].forEach((id) => $(id).addEventListener("change", () => { ocultarMsg($("msgAdmin")); renderAsistencia(); }));
$("fNombre").addEventListener("input", renderAsistencia);

// Botones "Justificar" y "Revisar" (delegación de eventos sobre la tabla)
$("tbodyAdmin").addEventListener("click", (e) => {
  const rev = e.target.closest("[data-rev]");
  if (rev) { abrirRevision(Number(rev.dataset.rev), rev.dataset.fecha); return; }
  const btn = e.target.closest("[data-just]");
  if (btn) abrirJustificacion(Number(btn.dataset.just), $("fFecha").value);
});
$("tbodyPendientes").addEventListener("click", (e) => {
  const rev = e.target.closest("[data-rev]");
  if (rev) abrirRevision(Number(rev.dataset.rev), rev.dataset.fecha);
});

/*7.1b Justificaciones pendientes enviadas por el personal*/

function renderPendientes() {
  const pendientes = Object.keys(justificaciones)
    .filter((k) => justificaciones[k].estado === "Pendiente")
    .map((k) => { const [id, fecha] = k.split("|"); return { id: Number(id), fecha: fecha, j: justificaciones[k] }; })
    .sort((a, b) => b.fecha.localeCompare(a.fecha));

  $("cardPendientes").hidden = pendientes.length === 0;
  $("tbodyPendientes").innerHTML = pendientes.map((p) => {
    const emp = empleados.find((x) => x.id === p.id);
    return "<tr><td>" + esc(emp.nombre) + "</td><td>" + formatoFecha(p.fecha) + "</td><td>" + esc(p.j.tipo) + "</td>" +
      "<td>" + esc(p.j.motivo) + "</td>" +
      '<td><button type="button" class="btn btn-primario btn-chico" data-rev="' + p.id + '" data-fecha="' + p.fecha + '">Revisar</button></td></tr>';
  }).join("");

  const nav = $("navPend");
  nav.hidden = pendientes.length === 0;
  nav.innerHTML = pendientes.length + '<span class="sr-only"> justificaciones pendientes</span>';
}

const dlgRev = $("dlgRevisar");
const formRev = $("formRevisar");

function abrirRevision(empId, iso) {
  const emp = empleados.find((x) => x.id === empId);
  const j = justificaciones[clave(empId, iso)];
  if (!j || j.estado !== "Pendiente") return;

  formRev.dataset.emp = empId;
  formRev.dataset.fecha = iso;
  $("rvEmpleado").value = emp.nombre + " (" + emp.area + ")";
  $("rvFecha").value = formatoFecha(iso);
  $("rvTipo").value = j.tipo;
  $("rvMotivo").value = j.motivo;
  $("rvDetalle").value = j.detalle;
  $("rvAdjunto").value = j.adjunto || "Ninguno";
  $("rvComentario").value = "";
  setError($("rvComentario"), $("errRvComentario"), "");
  dlgRev.showModal();
}

function resolverRevision(aprobar) {
  const empId = Number(formRev.dataset.emp);
  const iso = formRev.dataset.fecha;
  const k = clave(empId, iso);
  const j = justificaciones[k];
  const comentario = $("rvComentario").value.trim();

  // Para rechazar, el comentario es obligatorio
  let msg = "";
  if (!aprobar) {
    if (comentario === "") msg = "Escribe el motivo del rechazo.";
    else if (comentario.length < 10) msg = "Escribe al menos 10 caracteres.";
  }
  if (!setError($("rvComentario"), $("errRvComentario"), msg)) { enfocarPrimerError(formRev); return; }

  const emp = empleados.find((x) => x.id === empId);
  j.estado = aprobar ? "Aprobada" : "Rechazada";
  j.comentario = comentario;
  dlgRev.close();
  mostrarMsg($("msgAdmin"), "Justificación de " + emp.nombre + " (" + formatoFecha(iso) + ") " + (aprobar ? "aprobada." : "rechazada."), "ok");
  renderAsistencia();
}

$("btnAprobar").addEventListener("click", () => resolverRevision(true));
$("btnRechazar").addEventListener("click", () => resolverRevision(false));
$("btnCancelarRev").addEventListener("click", () => dlgRev.close());
$("rvComentario").addEventListener("input", () => setError($("rvComentario"), $("errRvComentario"), ""));

/*7.2 Ventana de justificación*/

const dlg = $("dlgJustificar");
const formJust = $("formJust");

function abrirJustificacion(empId, iso) {
  const emp = empleados.find((x) => x.id === empId);
  formJust.dataset.emp = empId;
  formJust.dataset.fecha = iso;

  $("jEmpleado").value = emp.nombre + " (" + emp.area + ")";
  $("jFecha").value = formatoFecha(iso);
  $("jTipo").value = estadoDe(emp, iso);
  $("jMotivo").value = "";
  $("jDetalle").value = "";
  $("jContador").textContent = "0/200";
  setError($("jMotivo"), $("errJMotivo"), "");
  setError($("jDetalle"), $("errJDetalle"), "");
  dlg.showModal();
}

$("jDetalle").addEventListener("input", () => {
  $("jContador").textContent = $("jDetalle").value.length + "/200";
  setError($("jDetalle"), $("errJDetalle"), "");
});
$("jMotivo").addEventListener("change", () => setError($("jMotivo"), $("errJMotivo"), ""));
$("btnCancelarJust").addEventListener("click", () => dlg.close());

formJust.addEventListener("submit", (e) => {
  e.preventDefault();
  const motivo = $("jMotivo").value;
  const detalle = $("jDetalle").value.trim();

  const ok1 = setError($("jMotivo"), $("errJMotivo"), motivo === "" ? "Selecciona un motivo." : "");
  let msgDet = "";
  if (detalle === "") msgDet = "Describe la justificación.";
  else if (detalle.length < 10) msgDet = "Escribe al menos 10 caracteres.";
  const ok2 = setError($("jDetalle"), $("errJDetalle"), msgDet);
  if (!(ok1 && ok2)) { enfocarPrimerError(formJust); return; }

  const empId = Number(formJust.dataset.emp);
  const iso = formJust.dataset.fecha;
  const emp = empleados.find((x) => x.id === empId);

  justificaciones[clave(empId, iso)] = {
    motivo: motivo, detalle: detalle, tipo: $("jTipo").value, origen: "talento_humano",
    estado: "Aprobada", adjunto: null, comentario: "", enviada: hoyISO()
  };
  dlg.close();
  mostrarMsg($("msgAdmin"), "Justificación guardada para " + emp.nombre + " (" + formatoFecha(iso) + ").", "ok");
  renderAsistencia();
});

/*7.3 Validación de rangos de fechas (compartida)*/

function validarRango(inicio, fin) {
  if (!inicio || !fin) return "Ingresa la fecha de inicio y la fecha de fin.";
  if (inicio > fin) return "La fecha de inicio no puede ser mayor que la fecha de fin.";
  const dias = (parseISO(fin) - parseISO(inicio)) / 86400000;
  if (dias > 366) return "El rango máximo permitido es de 1 año.";
  return "";
}

/*7.4 Reporte de asistencia*/

function resumenEmpleado(emp, inicio, fin) {
  const hoy = hoyISO();
  const r = { evaluados: 0, asistidos: 0, atrasos: 0, faltas: 0, justificadas: 0 };

  recorrerDias(inicio, fin, (iso) => {
    if (iso > hoy) return;
    const k = clave(emp.id, iso);
    const reg = registros[k];
    if (!reg && !esLaborable(iso)) return;

    if (reg) {
      r.evaluados++;
      r.asistidos++;
      if (aMin(reg.entrada) > aMin(ROLES[emp.rol].entrada)) {
        r.atrasos++;
        if (justAprobada(k)) r.justificadas++;
      }
    } else if (iso < hoy) { // el día en curso aún no cuenta como falta
      r.evaluados++;
      r.faltas++;
      if (justAprobada(k)) r.justificadas++;
    }
  });
  return r;
}

function renderReporte() {
  const inicio = $("rInicio").value;
  const fin = $("rFin").value;
  const area = $("rArea").value;
  const tbody = $("tbodyReporte");
  const tfoot = $("tfootReporte");

  const msg = validarRango(inicio, fin);
  marcarRango("rInicio", "rFin", "errReporte", msg, inicio, fin);
  if (msg) {
    tbody.innerHTML = '<tr><td class="vacio" colspan="8">Corrige los filtros para ver el reporte.</td></tr>';
    tfoot.innerHTML = "";
    $("grafico").innerHTML = "";
    $("subReporte").textContent = "";
    return;
  }

  const lista = empleados.filter((e) => area === "" || e.area === area);
  const total = { evaluados: 0, asistidos: 0, atrasos: 0, faltas: 0, justificadas: 0 };
  const porArea = {};

  const filas = lista.map((emp) => {
    const r = resumenEmpleado(emp, inicio, fin);
    Object.keys(total).forEach((k) => { total[k] += r[k]; });
    porArea[emp.area] = porArea[emp.area] || { evaluados: 0, asistidos: 0 };
    porArea[emp.area].evaluados += r.evaluados;
    porArea[emp.area].asistidos += r.asistidos;
    const pct = r.evaluados ? ((r.asistidos / r.evaluados) * 100).toFixed(1) + " %" : "—";
    return "<tr><td>" + esc(emp.nombre) + "</td><td>" + esc(emp.area) + "</td>" +
      '<td class="num">' + r.evaluados + '</td><td class="num">' + r.asistidos + "</td>" +
      '<td class="num">' + r.atrasos + '</td><td class="num">' + r.faltas + "</td>" +
      '<td class="num">' + r.justificadas + '</td><td class="num">' + pct + "</td></tr>";
  });

  tbody.innerHTML = filas.join("");
  const pctTotal = total.evaluados ? ((total.asistidos / total.evaluados) * 100).toFixed(1) + " %" : "—";
  tfoot.innerHTML = "<tr><td>Total del período</td><td>" + Object.keys(porArea).length + " departamentos</td>" +
    '<td class="num">' + total.evaluados + '</td><td class="num">' + total.asistidos + "</td>" +
    '<td class="num">' + total.atrasos + '</td><td class="num">' + total.faltas + "</td>" +
    '<td class="num">' + total.justificadas + '</td><td class="num">' + pctTotal + "</td></tr>";
  $("subReporte").textContent = formatoFecha(inicio) + " – " + formatoFecha(fin) + " · " + lista.length + " empleados";

  // Gráfico de barras por departamento
  const areas = Object.keys(porArea).sort();
  $("grafico").innerHTML = areas.map((a) => {
    const d = porArea[a];
    const pct = d.evaluados ? (d.asistidos / d.evaluados) * 100 : 0;
    return '<div class="barra-fila"><span>' + esc(a) + "</span>" +
      '<div class="barra-pista"><div class="barra" style="width:' + pct.toFixed(1) + '%"></div></div>' +
      '<span class="barra-valor"><strong>' + pct.toFixed(1) + " %</strong>" + d.asistidos + " / " + d.evaluados + " días</span></div>";
  }).join("") || '<p class="muted">Sin datos para mostrar.</p>';
}

$("formReporte").addEventListener("submit", (e) => {
  e.preventDefault();
  renderReporte();
  if ($("errReporte").textContent) enfocarPrimerError($("formReporte"));
});
$("btnLimpiarR").addEventListener("click", () => {
  const r = rangoPorDefecto();
  $("rInicio").value = r.inicio; $("rFin").value = r.fin; $("rArea").value = "";
  renderReporte();
});

/*7.5 Reporte de horas extra y pago*/

function resumenExtras(emp, inicio, fin) {
  let minutos = 0;
  let dias = 0;
  recorrerDias(inicio, fin, (iso) => {
    const extra = minutosExtra(emp, registros[clave(emp.id, iso)]);
    if (extra > 0) { minutos += extra; dias++; }
  });
  const valorHora = ROLES[emp.rol].valorHora;
  const valorExtra = valorHora * RECARGO_EXTRA;
  const total = Math.round((minutos / 60) * valorExtra * 100) / 100;
  return { minutos: minutos, dias: dias, valorHora: valorHora, valorExtra: valorExtra, total: total };
}

function renderExtras() {
  const inicio = $("eInicio").value;
  const fin = $("eFin").value;
  const area = $("eArea").value;
  const tbody = $("tbodyExtras");
  const tfoot = $("tfootExtras");

  const msg = validarRango(inicio, fin);
  marcarRango("eInicio", "eFin", "errExtras", msg, inicio, fin);
  if (msg) {
    tbody.innerHTML = '<tr><td class="vacio" colspan="8">Corrige los filtros para ver el reporte.</td></tr>';
    tfoot.innerHTML = "";
    $("subExtras").textContent = "";
    return;
  }

  const datos = empleados
    .filter((e) => area === "" || e.area === area)
    .map((emp) => ({ emp: emp, r: resumenExtras(emp, inicio, fin) }))
    .filter((x) => x.r.minutos > 0)
    .sort((a, b) => b.r.total - a.r.total);

  $("subExtras").textContent = formatoFecha(inicio) + " – " + formatoFecha(fin);

  if (datos.length === 0) {
    tbody.innerHTML = '<tr><td class="vacio" colspan="8">No hay horas extra registradas en el rango seleccionado.</td></tr>';
    tfoot.innerHTML = "";
    return;
  }

  let totMin = 0, totDias = 0, totPago = 0;
  tbody.innerHTML = datos.map((x) => {
    totMin += x.r.minutos; totDias += x.r.dias; totPago += x.r.total;
    return "<tr><td>" + esc(x.emp.nombre) + "</td><td>" + esc(x.emp.area) + "</td><td>" + ROLES[x.emp.rol].nombre + "</td>" +
      '<td class="num">' + x.r.dias + '</td><td class="num">' + fmtDuracion(x.r.minutos) + "</td>" +
      '<td class="num">' + fmtDinero(x.r.valorHora) + '</td><td class="num">' + fmtDinero(x.r.valorExtra) + "</td>" +
      '<td class="num">' + fmtDinero(x.r.total) + "</td></tr>";
  }).join("");

  tfoot.innerHTML = '<tr><td colspan="3">Total del período</td><td class="num">' + totDias + "</td>" +
    '<td class="num">' + fmtDuracion(totMin) + '</td><td></td><td></td><td class="num">' + fmtDinero(totPago) + "</td></tr>";
}

$("formExtras").addEventListener("submit", (e) => {
  e.preventDefault();
  renderExtras();
  if ($("errExtras").textContent) enfocarPrimerError($("formExtras"));
});
$("btnLimpiarE").addEventListener("click", () => {
  const r = rangoPorDefecto();
  $("eInicio").value = r.inicio; $("eFin").value = r.fin; $("eArea").value = "";
  renderExtras();
});

/*8. GENERADOR DE PDF (sin librerías, funciona sin internet)*/

// Ancho de cada carácter ASCII (32 a 126) en Helvetica y Helvetica-Bold, para centrar y saltar de línea
const ANCHOS_HELV = [
  278, 278, 355, 556, 556, 889, 667, 191, 333, 333, 389, 584, 278, 333, 278, 278,
  556, 556, 556, 556, 556, 556, 556, 556, 556, 556, 278, 278, 584, 584, 584, 556,
  1015, 667, 667, 722, 722, 667, 611, 778, 722, 278, 500, 667, 556, 833, 722, 778,
  667, 778, 722, 667, 611, 722, 667, 944, 667, 667, 611, 278, 278, 278, 469, 556,
  333, 556, 556, 500, 556, 556, 278, 556, 556, 222, 222, 500, 222, 833, 556, 556,
  556, 556, 333, 500, 278, 556, 500, 722, 500, 500, 500, 334, 260, 334, 584
];
const ANCHOS_BOLD = [
  278, 333, 474, 556, 556, 889, 722, 238, 333, 333, 389, 584, 278, 333, 278, 278,
  556, 556, 556, 556, 556, 556, 556, 556, 556, 556, 333, 333, 584, 584, 584, 611,
  975, 722, 722, 722, 722, 667, 611, 778, 722, 278, 556, 722, 611, 833, 722, 778,
  667, 778, 722, 667, 611, 722, 667, 944, 667, 667, 611, 333, 278, 333, 584, 556,
  333, 556, 611, 556, 611, 556, 333, 611, 611, 278, 278, 556, 278, 889, 611, 611,
  611, 611, 389, 556, 333, 611, 556, 778, 556, 556, 500, 389, 280, 389, 584
];

function anchoTexto(texto, size, negrita) {
  const tabla = negrita ? ANCHOS_BOLD : ANCHOS_HELV;
  let total = 0;
  for (const ch of texto) {
    const code = ch.normalize("NFD").charCodeAt(0); // "á" mide como "a"
    total += code >= 32 && code <= 126 ? tabla[code - 32] : 556;
  }
  return (total * size) / 1000;
}

// Convierte texto a la codificación del PDF (WinAnsi) y escapa ( ) \
const WINANSI = { "€": 0x80, "…": 0x85, "‘": 0x91, "’": 0x92, "“": 0x93, "”": 0x94, "•": 0x95, "–": 0x96, "—": 0x97 };
function pdfStr(texto) {
  let salida = "";
  for (const ch of texto.replace(/[\r\n\t]+/g, " ")) {
    let c = ch.charCodeAt(0);
    if (WINANSI[ch]) c = WINANSI[ch];
    else if (c > 255) c = 63; // "?"
    const car = String.fromCharCode(c);
    salida += car === "(" || car === ")" || car === "\\" ? "\\" + car : car;
  }
  return salida;
}

// Parte un texto en líneas que caben en "anchoMax" puntos
function envolver(texto, anchoMax, size) {
  const lineas = [];
  texto.split(/\r?\n/).forEach((parrafo) => {
    let actual = "";
    parrafo.split(/\s+/).filter(Boolean).forEach((palabra) => {
      // Palabra más ancha que la línea: se corta
      while (anchoTexto(palabra, size, false) > anchoMax) {
        let n = palabra.length - 1;
        while (n > 1 && anchoTexto(palabra.slice(0, n), size, false) > anchoMax) n--;
        if (actual) { lineas.push(actual); actual = ""; }
        lineas.push(palabra.slice(0, n));
        palabra = palabra.slice(n);
      }
      const prueba = actual ? actual + " " + palabra : palabra;
      if (anchoTexto(prueba, size, false) <= anchoMax) actual = prueba;
      else { lineas.push(actual); actual = palabra; }
    });
    if (actual) lineas.push(actual);
  });
  return lineas;
}

// Recorta un texto con "…" si no cabe en "anchoMax"
function ajustar(texto, anchoMax, size) {
  if (anchoTexto(texto, size, false) <= anchoMax) return texto;
  let t = texto;
  while (t.length > 1 && anchoTexto(t + "…", size, false) > anchoMax) t = t.slice(0, -1);
  return t + "…";
}

// Arma el PDF (una página A4); si un campo viene vacío queda en blanco para llenarlo a mano
function generarPDFJustificacion(d) {
  const IZQ = 56, DER = 539, ANCHO_PAG = 595;
  const ops = [];

  const texto = (x, y, t, size, negrita, gris) => {
    ops.push("BT /" + (negrita ? "F2" : "F1") + " " + size + " Tf " + (gris || 0) + " g " +
      x.toFixed(2) + " " + y.toFixed(2) + " Td (" + pdfStr(t) + ") Tj ET");
  };
  const centrado = (y, t, size, negrita, gris) => {
    texto((ANCHO_PAG - anchoTexto(t, size, negrita)) / 2, y, t, size, negrita, gris);
  };
  const linea = (x1, y1, x2, y2, grosor) => {
    ops.push("0 G " + (grosor || 0.6) + " w " + x1 + " " + y1 + " m " + x2 + " " + y2 + " l S");
  };
  const seccion = (y, titulo) => {
    texto(IZQ, y, titulo, 10.5, true);
    linea(IZQ, y - 4, DER, y - 4, 0.8);
  };
  const fila = (y, etiqueta, valor, subrayar) => {
    texto(IZQ, y, etiqueta, 9.5, true);
    if (subrayar !== false) linea(190, y - 4, DER, y - 4, 0.5);
    if (valor) texto(193, y, ajustar(valor, DER - 195, 10), 10);
  };

  // Encabezado
  centrado(800, "UNIVERSIDAD LAICA ELOY ALFARO DE MANABÍ", 13, true);
  centrado(783, "Departamento de Talento Humano", 10.5, false, 0.35);
  linea(IZQ, 772, DER, 772, 1);
  centrado(748, "SOLICITUD DE JUSTIFICACIÓN DE ATRASO O INASISTENCIA", 12.5, true);
  const emision = "Fecha de emisión: " + formatoFecha(hoyISO());
  texto(DER - anchoTexto(emision, 9.5, false), 726, emision, 9.5, false, 0.35);

  // 1. Datos del servidor
  seccion(700, "1. DATOS DEL SERVIDOR");
  fila(676, "Nombre completo", d.nombre);
  fila(652, "Usuario", d.usuario);
  fila(628, "Área o departamento", d.area);
  fila(604, "Cargo", d.cargo);
  fila(580, "Horario de trabajo", d.horario);

  // 2. Detalle de la novedad
  seccion(548, "2. DETALLE DE LA NOVEDAD");
  const marca = (activo) => (activo ? "[ X ]" : "[    ]");
  fila(524, "Tipo de novedad", marca(d.tipo === "Atrasado") + " Atraso        " + marca(d.tipo === "Falta") + " Inasistencia", false);
  fila(500, "Fecha de la novedad", d.fecha);
  fila(476, "Entrada registrada", d.entradaReg);

  // 3. Justificación
  seccion(444, "3. JUSTIFICACIÓN");
  fila(420, "Motivo", d.motivo);
  texto(IZQ, 396, "Detalle", 9.5, true);
  const lineasDetalle = d.detalle ? envolver(d.detalle, DER - IZQ - 6, 10) : [];
  const total = Math.min(Math.max(6, lineasDetalle.length), 9);
  for (let i = 0; i < total; i++) {
    const y = 376 - i * 18;
    linea(IZQ, y - 4, DER, y - 4, 0.5);
    if (lineasDetalle[i]) texto(IZQ + 2, y, lineasDetalle[i], 10);
  }

  // 4. Documentos de respaldo
  seccion(250, "4. DOCUMENTOS DE RESPALDO");
  texto(IZQ, 228, "[    ] Certificado médico        [    ] Oficio o convocatoria        [    ] Otro: ____________________", 9.5);

  // Declaración
  envolver("Declaro que la información consignada es verdadera y me comprometo a presentar los documentos de respaldo que se requieran.", DER - IZQ, 9.5)
    .forEach((l, i) => texto(IZQ, 196 - i * 13, l, 9.5));

  // Firmas
  linea(IZQ, 120, IZQ + 200, 120, 0.8);
  linea(DER - 200, 120, DER, 120, 0.8);
  texto(IZQ, 107, d.nombre ? ajustar(d.nombre, 200, 9.5) : "Nombre", 9.5);
  texto(IZQ, 95, "Firma del servidor", 9, false, 0.35);
  texto(DER - 200, 107, "Recibido por Secretaría / Talento Humano", 9, false);
  texto(DER - 200, 95, "Nombre, firma y fecha de recepción", 9, false, 0.35);

  centrado(40, "Documento generado por el Sistema de Asistencia - Talento Humano ULEAM", 8, false, 0.35);

  // Estructura del archivo PDF
  const contenido = ops.join("\n");
  const objetos = [];
  objetos[1] = "<< /Type /Catalog /Pages 2 0 R >>";
  objetos[2] = "<< /Type /Pages /Kids [3 0 R] /Count 1 >>";
  objetos[3] = "<< /Type /Page /Parent 2 0 R /MediaBox [0 0 595 842] /Resources << /Font << /F1 5 0 R /F2 6 0 R >> >> /Contents 4 0 R >>";
  objetos[4] = "<< /Length " + contenido.length + " >>\nstream\n" + contenido + "\nendstream";
  objetos[5] = "<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica /Encoding /WinAnsiEncoding >>";
  objetos[6] = "<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold /Encoding /WinAnsiEncoding >>";
  objetos[7] = "<< /Title (" + pdfStr("Solicitud de justificación de atraso o inasistencia") + ") >>";

  let pdf = "%PDF-1.4\n";
  const posiciones = [];
  for (let i = 1; i <= 7; i++) {
    posiciones[i] = pdf.length;
    pdf += i + " 0 obj\n" + objetos[i] + "\nendobj\n";
  }
  const inicioXref = pdf.length;
  pdf += "xref\n0 8\n0000000000 65535 f \n";
  for (let i = 1; i <= 7; i++) pdf += String(posiciones[i]).padStart(10, "0") + " 00000 n \n";
  pdf += "trailer\n<< /Size 8 /Root 1 0 R /Info 7 0 R >>\nstartxref\n" + inicioXref + "\n%%EOF";

  const bytes = new Uint8Array(pdf.length);
  for (let i = 0; i < pdf.length; i++) bytes[i] = pdf.charCodeAt(i) & 255;
  return bytes;
}

/*9. INICIO*/

generarDatosIniciales();
sembrarJustificaciones();
mostrarVista("vistaLogin");
