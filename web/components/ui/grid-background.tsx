import React from "react";

export function GridBackground() {
  return (
    <div className="bg-background pointer-events-none absolute inset-0 -z-10 flex items-center justify-center overflow-hidden">
      {/* Usamos o utilitário bg-grid-white que criamos nativamente no globals.css */}
      <div className="bg-grid-white bg-size:3rem_3rem absolute inset-0" />

      {/* Máscara Radial cravada. Apaga o grid nas bordas. */}
      <div className="bg-background [radial-gradient(ellipse_60%_60%_at_50%_50%,transparent_20%,black_100%)] absolute inset-0" />

      {/* Glow sutil no teto com as medidas absolutas garantidas */}
      <div className="bg-primary absolute top-0 left-1/2 -z-10 h-160 w-160 -translate-x-1/2 -translate-y-1/2 rounded-full opacity-5 blur-[120px]" />
    </div>
  );
}
