import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import style from "./seccion_1.module.css";
import { icon } from "../../../../core/icons";

export type CartItem = {
  id: string;
  titulo: string;
  categoria: string;
  marca: string;
  imagen: string;
  cantidad: number;
};

const STORAGE_KEY = "cartItems";
const WHATSAPP_NUMBER = "51942055324";

const Seccion_1 = () => {
  const [items, setItems] = useState<CartItem[]>([]);
  const [seleccionados, setSeleccionados] = useState<Set<string>>(new Set());

  const cargarItems = () => {
    const data = localStorage.getItem(STORAGE_KEY);
    if (!data) return setItems([]);
    try {
      const parsed = JSON.parse(data) as CartItem[];
      setItems(Array.isArray(parsed) ? parsed : []);
    } catch {
      setItems([]);
    }
  };

  useEffect(() => {
    cargarItems();
    window.addEventListener("cartUpdated", cargarItems);
    return () => window.removeEventListener("cartUpdated", cargarItems);
  }, []);

  const persistir = (nextItems: CartItem[]) => {
    setItems(nextItems);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(nextItems));
  };

  const toggleSeleccionado = (id: string) => {
    setSeleccionados((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const todosSeleccionados =
    items.length > 0 && seleccionados.size === items.length;

  const toggleTodos = () => {
    setSeleccionados(
      todosSeleccionados ? new Set() : new Set(items.map((i) => i.id))
    );
  };

  const cambiarCantidad = (id: string, delta: number) => {
    const nextItems = items.map((item) =>
      item.id === id
        ? { ...item, cantidad: Math.max(1, item.cantidad + delta) }
        : item
    );
    persistir(nextItems);
    window.dispatchEvent(new Event("cartUpdated"));
  };

  const eliminar = (id: string) => {
    persistir(items.filter((item) => item.id !== id));
    setSeleccionados((prev) => {
      const next = new Set(prev);
      next.delete(id);
      return next;
    });
    window.dispatchEvent(new Event("cartUpdated"));
  };

  const totalItems = useMemo(
    () => items.reduce((acc, item) => acc + item.cantidad, 0),
    [items]
  );

  const totalSeleccionados = useMemo(
    () =>
      items
        .filter((i) => seleccionados.has(i.id))
        .reduce((acc, item) => acc + item.cantidad, 0),
    [items, seleccionados]
  );

  const armarMensaje = (lista: CartItem[]) =>
    [
      "Hola, quiero cotizar los siguientes productos:",
      "",
      ...lista.map(
        (item) =>
          `• ${item.titulo} (${item.categoria}) — cantidad: ${item.cantidad}`
      ),
    ].join("\n");

  const abrirWhatsApp = (lista: CartItem[]) => {
    if (lista.length === 0) return;
    window.open(
      `https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(armarMensaje(lista))}`,
      "_blank",
      "noopener,noreferrer"
    );
  };

  if (items.length === 0) {
    return (
      <section className={style.vacio}>
        <div className={style.vacioIcono}>
          <svg viewBox="0 0 80 80" aria-hidden="true" className={style.vacioSvg}>
            <rect x="16" y="28" width="48" height="28" rx="6" />
            <path d="M28 16h24v16H28z" />
            <circle cx="58" cy="18" r="9" />
            <path d="M56 18h4M60 18l-2 2M60 18l-2-2" />
          </svg>
        </div>
        <h2 className={style.vacioTitulo}>
          Volver a <span>Comprar</span>
        </h2>
        <p className={style.vacioTexto}>
          Tu carrito está vacío. Explora el catálogo y agrega los productos que
          necesitas.
        </p>
        <Link to="/product" className={style.vacioBoton}>
          Volver a comprar
        </Link>
      </section>
    );
  }

  return (
    <section className={style.seccion}>
      <div className={style.contenido}>
        <div className={style.listaArea}>
          <h2 className={style.titulo}>
            {icon.iconCarrito({ className: style.modalIconoImagen })}
            <span>Mi Carrito</span>
          </h2>

          <div className={style.selector} onClick={toggleTodos}>
            <span
              className={`${style.selectorCheck} ${
                todosSeleccionados ? style.selectorCheckActivo : ""
              }`}
            >
              {todosSeleccionados ? "✓" : ""}
            </span>
            <span>
              {todosSeleccionados ? "Deseleccionar todo" : "Seleccionar todo"}
            </span>
          </div>

          <div className={style.lista}>
            {items.map((item) => {
              const estaSeleccionado = seleccionados.has(item.id);
              return (
                <article
                  key={item.id}
                  className={`${style.card} ${
                    estaSeleccionado ? style.cardSeleccionada : ""
                  }`}
                >
                  <div
                    className={`${style.cardCheck} ${
                      estaSeleccionado ? style.cardCheckActivo : ""
                    }`}
                    onClick={() => toggleSeleccionado(item.id)}
                    role="checkbox"
                    aria-checked={estaSeleccionado}
                    tabIndex={0}
                    onKeyDown={(e) =>
                      e.key === " " && toggleSeleccionado(item.id)
                    }
                  >
                    {estaSeleccionado ? "✓" : ""}
                  </div>

                  <div className={style.cardImagenWrap}>
                    <img
                      src={item.imagen}
                      alt={item.titulo}
                      className={style.cardImagen}
                    />
                  </div>

                  <div className={style.cardInfo}>
                    <div className={style.badges}>
                      <span className={style.badgeCategoria}>
                        {item.categoria}
                      </span>
                      <span className={style.badgeMarca}>{item.marca}</span>
                    </div>
                    <h3 className={style.cardTitulo}>{item.titulo}</h3>
                  </div>

                  <div className={style.acciones}>
                    <div className={style.cantidadBox}>
                      <button
                        type="button"
                        onClick={() => cambiarCantidad(item.id, -1)}
                      >
                        −
                      </button>
                      <span>{item.cantidad}</span>
                      <button
                        type="button"
                        onClick={() => cambiarCantidad(item.id, 1)}
                      >
                        +
                      </button>
                    </div>
                    <button
                      type="button"
                      className={style.eliminarBtn}
                      onClick={() => eliminar(item.id)}
                    >
                      Eliminar
                    </button>
                  </div>
                </article>
              );
            })}
          </div>
        </div>

        <aside className={style.resumen}>
          <h3 className={style.resumenTitulo}>Resumen de la orden</h3>
          <p className={style.resumenTexto}>
            Costo de envío a coordinar vía WhatsApp
          </p>

          <div className={style.resumenProductos}>
            Productos en carrito: <strong>{items.length}</strong>
            <br />
            Productos seleccionados: <strong>{seleccionados.size}</strong>
          </div>

          <div className={style.totales}>
            <p className={style.totalFinal}>
              <span>Unidades totales:</span>
              <strong>{totalSeleccionados}</strong>
            </p>
          </div>

          <button
            type="button"
            className={style.botonVerde}
            disabled={seleccionados.size === 0}
            onClick={() => abrirWhatsApp(items.filter((i) => seleccionados.has(i.id)))}
          >
            Cotizar seleccionados
          </button>

          <button
            type="button"
            className={style.botonVerdeSecundario}
            onClick={() => abrirWhatsApp(items)}
          >
            Cotizar todo
          </button>

          <Link to="/product" className={style.verMas}>
            Ver más productos
          </Link>
        </aside>
      </div>
    </section>
  );
};

export default Seccion_1;
