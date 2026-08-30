import styles from "./page.module.css";
import Image from "next/image";

const metrics = [
  ["Usuarios activos", "1.284", "+8% este mes"],
  ["Prestadores publicados", "326", "24 nuevos"],
  ["Trabajos en curso", "87", "12 por confirmar"],
  ["Denuncias abiertas", "6", "2 de prioridad alta"]
];

const reviews = [
  { type: "Matrícula", person: "Ramiro Sánchez", detail: "Gasista · Río Grande", age: "Hace 12 min", priority: "Normal" },
  { type: "Denuncia", person: "Conversación #1842", detail: "Posible intercambio de teléfono", age: "Hace 34 min", priority: "Alta" },
  { type: "Documento fiscal", person: "Sofía Martínez", detail: "Monotributo · Ushuaia", age: "Hace 1 h", priority: "Normal" }
];

export default function Home() {
  return <div className={styles.shell}>
    <aside className={styles.sidebar}>
      <div className={styles.brand}><Image src="/brand/laburapp-wordmark-clean.png" alt="LaburApp" width={185} height={48} priority /><small>Administración</small></div>
      <nav>{["Resumen", "Usuarios", "Prestadores", "Matrículas", "Trabajos", "Pagos mock", "Denuncias", "Publicidad", "Configuración", "Auditoría"].map((item, index) => <a className={index === 0 ? styles.active : ""} href={`#${item.toLowerCase()}`} key={item}>{item}</a>)}</nav>
      <div className={styles.session}><span>AD</span><div><strong>Admin demo</strong><small>Entorno local</small></div></div>
    </aside>
    <main className={styles.main}>
      <header><div><p className={styles.kicker}>OPERACIONES</p><h1>Buen día. Esto necesita tu atención.</h1></div><div className={styles.demo}>● MODO DEMO</div></header>
      <section className={styles.metrics}>{metrics.map(([label, value, note]) => <article key={label}><span>{label}</span><strong>{value}</strong><small>{note}</small></article>)}</section>
      <div className={styles.grid}>
        <section className={styles.panel}>
          <div className={styles.panelTitle}><div><p className={styles.kicker}>COLA DE REVISIÓN</p><h2>Casos pendientes</h2></div><button>Ver todos</button></div>
          <div className={styles.table}>{reviews.map((item) => <div className={styles.tableRow} key={item.person}>
            <span className={item.priority === "Alta" ? styles.high : styles.pill}>{item.type}</span><div><strong>{item.person}</strong><small>{item.detail}</small></div><time>{item.age}</time><button className={styles.review}>Revisar</button>
          </div>)}</div>
        </section>
        <aside className={styles.panel}>
          <p className={styles.kicker}>TRABAJOS</p><h2>Estado operativo</h2>
          {["Solicitud", "Presupuesto", "Pago protegido", "En curso", "Finalización"].map((label, index) => <div className={styles.progress} key={label}><div><span>{label}</span><strong>{[42, 31, 18, 14, 9][index]}</strong></div><i><b style={{ width: `${[90, 66, 40, 32, 21][index]}%` }} /></i></div>)}
          <div className={styles.mockNotice}><strong>Pagos en modo simulado</strong><p>No se mueve dinero real. Los eventos permiten probar aprobaciones, rechazos, reembolsos y disputas.</p></div>
        </aside>
      </div>
      <footer>Datos ficticios para desarrollo · Las acciones administrativas reales requieren Supabase y un usuario con rol seguro.</footer>
    </main>
  </div>;
}
