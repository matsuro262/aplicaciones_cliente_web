// 1. Seleccionamos los campos de entrada y el botón único
const input1 = document.getElementById("numero1");
const input2 = document.getElementById("numero2");
const boton_calcular = document.getElementById("calcularTodo");

// 2. Agrupamos los 5 campos de resultado en un array ordenado
const camposResultados = [
    document.getElementById("res_suma"),
    document.getElementById("res_resta"),
    document.getElementById("res_multiplicar"),
    document.getElementById("res_dividir"),
    document.getElementById("res_modulo")
];

// 3. Escuchamos el click del botón único
boton_calcular.addEventListener("click", function() {
    // Convertimos los valores ingresados a números reales
    const valor1 = Number(input1.value) || 0;
    const valor2 = Number(input2.value) || 0;

    // 4. Guardamos las 5 operaciones matemáticas en otro array (en el mismo orden)
    const operaciones = [
        valor1 + valor2,                         // Posición 0: Suma
        valor1 - valor2,                         // Posición 1: Resta
        valor1 * valor2,                         // Posición 2: Multiplicación
        valor2 !== 0 ? (valor1 / valor2) : "Error (Div 0)", // Posición 3: División
        valor2 !== 0 ? (valor1 % valor2) : "Error (Div 0)"  // Posición 4: Módulo
    ];

    // 5. El BUCLE de 5 iteraciones (corre del índice 0 al 4)
    for (let i = 0; i < 5; i++) {
        // En cada vuelta (i), asignamos la operación 'i' al campo de texto 'i'
        camposResultados[i].value = operaciones[i];
    }
});
