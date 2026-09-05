export type ServiceFamily = {
  name: string;
  specialties: string[];
  description: string;
};

export const providerServiceCatalog: ServiceFamily[] = [
  { name: "Instalaciones", description: "Instalaciones y reparaciones esenciales del hogar.", specialties: ["Gasista", "Electricidad domiciliaria", "Reparación de pérdidas de agua", "Instalación de agua", "Instalación de desagües", "Instalación de cloacas", "Instalación sanitaria", "Destape de cañerías", "Instalación de termotanque", "Instalación de calefón", "Instalación de cocina", "Instalación de artefactos"] },
  { name: "Calefacción", description: "Instalación, limpieza y mantenimiento de sistemas de calefacción.", specialties: ["Reparación de calefactores", "Limpieza de calefactores", "Reparación de calderas", "Instalación de radiadores", "Mantenimiento de calefacción"] },
  { name: "Climatización", description: "Soluciones de frío, aire acondicionado y refrigeración.", specialties: ["Reparación de aire acondicionado", "Instalación de aire acondicionado", "Carga de gas", "Reparación de heladeras", "Reparación de freezers"] },
  { name: "Construcción", description: "Obra, terminaciones y reparaciones estructurales.", specialties: ["Albañilería", "Construcción en seco", "Durlock", "Revoques", "Reparación de paredes", "Reparación de techos", "Reparación de humedad"] },
  { name: "Pisos y revestimientos", description: "Colocación, terminación y mantenimiento de pisos.", specialties: ["Colocación de cerámicos", "Colocación de porcelanato", "Colocación de pisos flotantes", "Colocación de pisos vinílicos", "Colocación de zócalos", "Pulido de pisos"] },
  { name: "Pintura", description: "Pintura, protección e impermeabilización de superficies.", specialties: ["Pintura interior", "Pintura exterior", "Pintura de muebles", "Pintura de aberturas", "Impermeabilización", "Aplicación de revestimientos"] },
  { name: "Carpintería", description: "Fabricación, armado e instalación de trabajos en madera.", specialties: ["Fabricación de muebles", "Reparación de muebles", "Armado de muebles", "Instalación de placares", "Instalación de estantes", "Reparación de puertas", "Reparación de ventanas"] },
  { name: "Herrería y metal", description: "Fabricación, soldadura y reparación de estructuras metálicas.", specialties: ["Trabajos de herrería", "Soldadura", "Fabricación de rejas", "Fabricación de portones", "Reparación de estructuras", "Fabricación de muebles metálicos"] },
  { name: "Reparaciones del hogar", description: "Diagnóstico y reparación de equipos y artefactos domésticos.", specialties: ["Reparación de lavarropas", "Reparación de cocinas", "Reparación de hornos", "Reparación de pequeños electrodomésticos", "Reparación de bombas de agua", "Reparación de motores"] },
  { name: "Tecnología", description: "Soporte, reparación e instalación de tecnología doméstica.", specialties: ["Reparación de computadoras", "Instalación de programas", "Reparación de celulares", "Instalación de cámaras", "Instalación de alarmas", "Instalación de redes Wi-Fi", "Reparación de impresoras", "Instalación de porteros eléctricos"] },
  { name: "Vehículos", description: "Mantenimiento, reparación y cuidado de vehículos.", specialties: ["Mecánica general", "Electricidad del automotor", "Reparación de motos", "Reparación de bicicletas", "Cambio de aceite", "Auxilio mecánico", "Lavado y limpieza de vehículos", "Detailing"] },
  { name: "Fletes y mudanzas", description: "Traslados, movimientos de carga y retiros.", specialties: ["Fletes pequeños", "Mudanzas", "Traslado de muebles", "Carga y descarga", "Retiro de materiales", "Retiro de escombros"] },
  { name: "Limpieza y hogar", description: "Limpieza y mantenimiento de hogares y espacios de trabajo.", specialties: ["Limpieza domiciliaria", "Limpieza profunda", "Limpieza de vidrios", "Limpieza de alfombras", "Limpieza de tapizados", "Limpieza de oficinas", "Limpieza de comercios", "Limpieza de obra", "Limpieza de patios", "Lavado y planchado"] },
  { name: "Exteriores y jardín", description: "Cuidado, limpieza y mejora de espacios exteriores.", specialties: ["Corte de pasto", "Jardinería", "Poda", "Mantenimiento de patios", "Instalación de riego", "Limpieza de canaletas", "Limpieza de terrenos", "Construcción de cercos", "Mantenimiento de espacios verdes"] },
  { name: "Seguridad", description: "Instalación de sistemas de seguridad y control.", specialties: ["Instalación de cámaras", "Instalación de alarmas", "Instalación de sensores", "Control de accesos", "Cerraduras electrónicas"] },
  { name: "Cerrajería", description: "Apertura, reparación e instalación de cerraduras.", specialties: ["Apertura de puertas", "Cambio de cerraduras", "Reparación de cerraduras", "Copia de llaves", "Cerrajería automotor", "Instalación de cerraduras digitales"] },
  { name: "Cuidado y asistencia", description: "Acompañamiento y cuidado responsable de personas y mascotas.", specialties: ["Cuidado de adultos mayores", "Niñera", "Acompañamiento", "Cuidado de mascotas", "Paseo de perros", "Adiestramiento básico"] },
  { name: "Servicios personales", description: "Bienestar, estética y cuidado personal.", specialties: ["Peluquería", "Barbería", "Manicuría", "Maquillaje", "Masajes", "Depilación"] },
  { name: "Ropa y arreglos", description: "Confección, ajustes y reparación de prendas y calzado.", specialties: ["Costura", "Arreglo de pantalones", "Cambio de cierres", "Ajuste de prendas", "Confección de ropa", "Reparación de calzado"] },
  { name: "Servicios creativos", description: "Producción visual, contenido y comunicación para personas y negocios.", specialties: ["Fotografía", "Video", "Edición de fotos", "Diseño de flyers", "Diseño de logos", "Manejo de redes sociales"] },
  { name: "Servicios educativos", description: "Clases y acompañamiento para aprender o preparar exámenes.", specialties: ["Apoyo escolar", "Clases particulares", "Clases de computación", "Clases de idiomas", "Clases de música", "Preparación para exámenes"] },
];

export const professionalSuggestions = [
  "Gasista matriculado", "Electricista domiciliario", "Plomero", "Técnico en calefacción", "Técnico en refrigeración", "Albañil", "Pintor", "Carpintero", "Herrero", "Técnico en reparación de electrodomésticos", "Técnico en informática", "Mecánico", "Fletero", "Personal de limpieza", "Jardinero", "Cerrajero", "Cuidador de adultos mayores", "Niñera", "Peluquero", "Costurero", "Fotógrafo", "Profesor particular",
];

export const certificationSuggestions = [
  "Matrícula vigente", "Identidad verificada", "Certificado de formación", "Curso de especialización", "Seguro de responsabilidad civil", "Primeros auxilios", "Manipulación de alimentos", "Antecedentes verificados", "Registro de conducir profesional", "Habilitación municipal",
];

export function specialtyDescription(familyName: string, specialty: string) {
  const family = providerServiceCatalog.find((item) => item.name === familyName);
  return `${specialty}. ${family?.description ?? "Servicio especializado para necesidades particulares."}`;
}

export function serviceCombinationIsValid(familyName?: string, specialty?: string) {
  return !!providerServiceCatalog.find((family) => family.name === familyName)?.specialties.includes(specialty ?? "");
}
