import Image from "next/image";
import Link from "next/link";
import styles from "./page.module.css";

const sections = [
  {
    href: "/reviews",
    eyebrow: "MODERACIÓN",
    title: "Revisar reseñas",
    description: "Consultá las reseñas reales, ocultá las que necesiten revisión, restauralas o eliminalas con confirmación.",
  },
  {
    href: "/account-deletions",
    eyebrow: "CUENTAS",
    title: "Solicitudes de eliminación",
    description: "Revisá las solicitudes después del plazo de 72 horas y confirmá manualmente cada eliminación.",
  },
];

export default function Home() {
  return <main className={styles.dashboard}>
    <div className={styles.dashboardInner}>
      <Image src="/brand/laburapp-wordmark-clean.png" alt="LaburApp" width={185} height={48} priority />
      <p className={styles.dashboardEyebrow}>ADMINISTRACIÓN</p>
      <h1>Panel de control</h1>
      <p className={styles.dashboardIntro}>Elegí la tarea que necesitás revisar. Las secciones muestran datos reales de LaburApp.</p>
      <div className={styles.dashboardCards}>
        {sections.map((section) => <Link href={section.href} className={styles.dashboardCard} key={section.href}>
          <span>{section.eyebrow}</span>
          <h2>{section.title}</h2>
          <p>{section.description}</p>
          <strong>Entrar →</strong>
        </Link>)}
      </div>
    </div>
  </main>;
}
