# Tablero territorial · Sucre

Uso interno. Los datos van comprimidos y cifrados en `contenido.bin` (AES-256-GCM con clave derivada por PBKDF2). Sin la clave el tablero no abre.

Tiene cuatro secciones: elecciones por puesto de votación, problemas por municipio frente al país (salud, seguridad, economía, educación y servicios), caracterización escrita y transferencia del voto presidencial a lo local.

Fuentes: Registraduría Nacional del Estado Civil, DNP (TerriData), DANE y panel municipal CEDE de la Universidad de los Andes.

Este repositorio guarda solo la versión publicada. Se regenera con `node publicar.js "clave"` desde la carpeta de trabajo.
