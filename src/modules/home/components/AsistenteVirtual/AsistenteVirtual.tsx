import { useState, useRef, useEffect } from "react";
import { supabase } from "../../../../lib/supabase";
import { images } from "../../../../assets/img/index";
import style from "./AsistenteVirtual.module.css";

// ─── Constantes ───────────────────────────────────────────────────────────────

const BACKEND_URL      = "https://backendpythongorrioncito.onrender.com";
const STORAGE_KEY      = "gorrioncito_chat_id";
const HORAS_EXPIRACION = 5;

// ─── Tipos ────────────────────────────────────────────────────────────────────

interface ProductoCard {
  id:     number;
  nombre: string;
  imagen: string;
}

interface RespuestaBot {
  tipo:      "texto" | "productos";
  contenido: string | ProductoCard[];
  mensaje?:  string; // ← opcional, solo viene en tipo "productos"
}

interface Mensaje {
  id:           number;
  textoCliente: string;
  respuestaBot: RespuestaBot | null; // null = esperando
}

// ─── Storage helpers ──────────────────────────────────────────────────────────

const guardarChat = (id: number, fecha: string) =>
  localStorage.setItem(STORAGE_KEY, JSON.stringify({ id, fecha }));

const leerChat = (): { id: number; fecha: string } | null => {
  try { return JSON.parse(localStorage.getItem(STORAGE_KEY) ?? "null"); }
  catch { return null; }
};

const chatExpirado = (fecha: string) =>
  (Date.now() - new Date(fecha).getTime()) / 36e5 >= HORAS_EXPIRACION;

const limpiarChat = () => localStorage.removeItem(STORAGE_KEY);

// ─── Componente ───────────────────────────────────────────────────────────────

const AsistenteVirtual = () => {
  const [open,     setOpen]     = useState(false);
  const [cargando, setCargando] = useState(false);
  const [enviando, setEnviando] = useState(false);
  const [mensaje,  setMensaje]  = useState("");
  const [mensajes, setMensajes] = useState<Mensaje[]>([]);
  const [chatId,   setChatId]   = useState<number | null>(null);

  const bodyRef     = useRef<HTMLDivElement>(null);
  const contadorRef = useRef(0);

  useEffect(() => {
    if (bodyRef.current)
      bodyRef.current.scrollTop = bodyRef.current.scrollHeight;
  }, [mensajes]);

  // ─── Chat ID ────────────────────────────────────────────────────────────────

  const obtenerChatId = async (): Promise<number | null> => {
    const cached = leerChat();
    if (cached && !chatExpirado(cached.fecha)) return cached.id;

    limpiarChat();

    const { data, error } = await supabase
      .from("historial_chat")
      .insert({})
      .select("historial_chat_id, historialfechacreacion")
      .single();

    if (error || !data) return null;

    guardarChat(data.historial_chat_id, data.historialfechacreacion);
    return data.historial_chat_id;
  };

  // ─── Handlers ───────────────────────────────────────────────────────────────

  const handleAbrir = async () => {
    if (open) return;
    setCargando(true);
    setMensajes([]);
    const id = await obtenerChatId();
    if (id) { setChatId(id); setOpen(true); }
    setCargando(false);
  };

  const handleCerrar = () => {
    setOpen(false);
    setChatId(null);
    setMensajes([]);
    setMensaje("");
    setEnviando(false);
  };

  const handleEnviar = async () => {
    const texto = mensaje.trim();
    if (!texto || enviando || !chatId) return;

    setMensaje("");
    setEnviando(true);

    const localId = ++contadorRef.current;
    setMensajes((prev) => [...prev, { id: localId, textoCliente: texto, respuestaBot: null }]);

    try {
      const res = await fetch(`${BACKEND_URL}/modelo/detectar`, {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({ historial_chat_id: chatId, mensajecliente: texto }),
      });

      const json = await res.json();

      // El backend devuelve { respuesta: { tipo, contenido } }
      const respuestaBot: RespuestaBot = json.respuesta ?? {
        tipo:      "texto",
        contenido: "Sin respuesta del servidor.",
      };

      setMensajes((prev) =>
        prev.map((m) => m.id === localId ? { ...m, respuestaBot } : m)
      );
    } catch {
      setMensajes((prev) =>
        prev.map((m) =>
          m.id === localId
            ? { ...m, respuestaBot: { tipo: "texto", contenido: "Error al conectar con el servidor." } }
            : m
        )
      );
    }

    setEnviando(false);
  };

  // ─── Render helpers ─────────────────────────────────────────────────────────

 const renderRespuestaBot = (respuesta: RespuestaBot) => {
  if (respuesta.tipo === "texto") {
    return <div className={style.mensajeBot}>{respuesta.contenido as string}</div>;
  }

  return (
    <div className={style.botProductos}>
      {respuesta.mensaje && (
        <p className={style.mensajePrevio}>{respuesta.mensaje}</p>
      )}
      <div className={style.carrusel}>
        {(respuesta.contenido as ProductoCard[]).map((p) => (
          <div key={p.id} className={style.productoCard}>
            <div className={style.productoCardImg}>
              {p.imagen ? (
                <img
                  src={p.imagen}
                  alt={p.nombre}
                  onError={(e) => { (e.currentTarget as HTMLImageElement).src = "/placeholder.png"; }}
                />
              ) : (
                <div className={style.productoCardSinImg}>Sin imagen</div>
              )}
            </div>
            <p className={style.productoCardNombre}>{p.nombre}</p>
          </div>
        ))}
      </div>
    </div>
  );
};
  const bloqueado = cargando || enviando || !chatId;

  // ─── JSX ────────────────────────────────────────────────────────────────────

  return (
    <>
      {!open && (
        <button className={style.btnAbrir} onClick={handleAbrir}>💬</button>
      )}

      {open && (
        <div className={style.chatModal}>

          {/* HEADER */}
          <div className={style.chatHeader}>
            <div className={style.headerContent}>
              <div className={style.headerLogoWrapper}>
                <img src={images.logoGorrion} alt="Logo" />
                <span className={style.estadoOnline} />
              </div>
              <div className={style.headerTitles}>
                <h2>Asistente Virtual</h2>
                <h1>GORRIONCITO</h1>
              </div>
            </div>
            <button className={style.btnCerrar} onClick={handleCerrar}>✖</button>
          </div>

          {/* BODY */}
          <div className={style.chatBody} ref={bodyRef}>

            {/* Bienvenida */}
            <div className={style.botRow}>
              <img src={images.perfilAsistente} alt="Asistente" className={style.botAvatar} />
              <div className={style.mensajeBot}>
                Bienvenido a Gorrioncito, tu asistente virtual. ¿En qué te podemos ayudar?
              </div>
            </div>

            {/* Historial */}
            {mensajes.map((m) => (
              <div key={m.id}>

                {/* Usuario */}
                <div className={style.userRow}>
                  <div className={style.mensajeUser}>
                    {m.textoCliente}
                    <div className={style.metaUser}>
                      <span className={m.respuestaBot ? style.checkLeido : style.checkEnviado}>
                        {m.respuestaBot === null ? "✓" : "✓✓"}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Bot */}
                <div className={style.botRow}>
                  <img src={images.perfilAsistente} alt="Asistente" className={style.botAvatar} />
                  {m.respuestaBot !== null ? (
                    renderRespuestaBot(m.respuestaBot)
                  ) : (
                    <div className={`${style.mensajeBot} ${style.pensando}`}>
                      <span /><span /><span />
                    </div>
                  )}
                </div>

              </div>
            ))}
          </div>

          {/* FOOTER */}
          <div className={style.chatFooter}>
            <input
              type="text"
              placeholder={cargando ? "Iniciando conversación..." : "Escribe tu mensaje..."}
              value={mensaje}
              onChange={(e) => setMensaje(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter") handleEnviar(); }}
              disabled={bloqueado}
            />
            <button onClick={handleEnviar} disabled={bloqueado}>
              <img src={images.enviar} alt="Enviar" />
            </button>
          </div>

        </div>
      )}
    </>
  );
};

export default AsistenteVirtual;
