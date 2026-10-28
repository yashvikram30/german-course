// The turning page, built out of paper-like strips. The leaf is a chain of narrow vertical strips hinged to each other, so it can bend as it
// lifts, instead of turning as a stiff card. Each strip has a front face and a back face (the other side of the sheet), is shaded by the angle
// it faces, and the whole leaf casts a shadow on the pages beneath.
//
// In an open book (two pages) the leaf is hinged at the spine: its front is the right-hand page, its back the left-hand page of the next
// spread, and it swings from the right half over to the left half. In single-page view it is hinged at the left edge and just turns away.

const STRIPS = 8;
const CURL = 3.6; // degrees of bend per strip at the point of strongest curl: the free edge lags behind the spine, as paper does

export interface Leaf {
  /** 0 = lying flat on the right, 1 = turned over onto the left. */
  set(p: number): void;
}

interface Options {
  two: boolean;
  W: number; // stage width
  H: number; // stage height
  front: () => HTMLElement | null; // a fresh clone of the page on the front of the leaf (the right-hand page)
  back: () => HTMLElement | null; // ... and of the page on its back (the left-hand page of the next spread); two-page view only
  under: { make: () => HTMLElement | null; side: "l" | "r" } | null; // the page uncovered underneath as the leaf lifts
}

const div = (cls: string) => {
  const d = document.createElement("div");
  d.className = cls;
  return d;
};

export function createLeaf(host: HTMLElement, o: Options): Leaf {
  const pw = o.two ? o.W / 2 : o.W; // one page
  const w = pw / STRIPS;
  const hinge = o.two ? pw : 0;

  if (o.under) {
    const u = div(`pg ${o.under.side === "l" ? "pg-l" : "pg-r"}`);
    Object.assign(u.style, { left: `${o.under.side === "r" ? pw : 0}px`, right: "auto", width: `${pw}px` });
    const c = o.under.make();
    if (c) {
      c.style.left = o.under.side === "r" ? `${-pw}px` : "0px"; // right-hand pages sit in the right half of the clone, left-hand ones in the left
      u.appendChild(c);
    } else u.classList.add("blank");
    host.appendChild(u);
  }

  const shadow = div("leaf-shadow");
  host.appendChild(shadow);

  const strips: { el: HTMLElement; fs: HTMLElement; bs: HTMLElement }[] = [];
  let parent: HTMLElement = host;
  for (let i = 0; i < STRIPS; i++) {
    const el = div("leaf-strip");
    Object.assign(el.style, { left: `${i === 0 ? hinge : w}px`, width: `${w + (i < STRIPS - 1 ? 0.8 : 0)}px`, height: `${o.H}px` }); // a hair of overlap hides the seams
    const front = div("leaf-front");
    const fc = o.front();
    if (fc) {
      fc.style.left = `${-(hinge + i * w)}px`;
      front.appendChild(fc);
    }
    const fs = div("leaf-shade");
    front.appendChild(fs);
    const back = div("leaf-back");
    if (o.two) {
      const bc = o.back();
      if (bc) {
        bc.style.left = `${-(pw - (i + 1) * w)}px`; // seen from behind, the strip shows the mirrored slice of the left-hand page
        back.appendChild(bc);
      }
    }
    const bs = div("leaf-shade");
    back.appendChild(bs);
    el.append(front, back);
    parent.appendChild(el);
    parent = el;
    strips.push({ el, fs, bs });
  }
  // The clones are laid out now that they are attached: show the right column of each.
  host.querySelectorAll<HTMLElement>("[data-scroll]").forEach((c) => {
    c.scrollLeft = Number(c.dataset.scroll);
  });

  return {
    set(p) {
      const spine = -180 * p;
      const curl = CURL * Math.sin(Math.PI * p);
      strips.forEach((s, i) => {
        s.el.style.transform = `rotateY(${i === 0 ? spine : curl}deg)`;
        const a = Math.min(180, Math.abs(spine + i * curl)); // the angle this strip faces away from flat
        const rad = (a * Math.PI) / 180;
        // squared, so the page darkens only as it stands up and the light falls across it, and stays clean while nearly flat
        s.fs.style.opacity = a < 90 ? String(0.2 * Math.sin(rad) ** 2) : "0";
        s.bs.style.opacity = a >= 90 ? String(0.14 * Math.sin(rad) ** 2 + 0.03) : "0";
      });
      // The shadow lies under the lifted part of the leaf only: from the hinge to where its free edge is over the page, softening past it.
      const edge = hinge + pw * Math.cos(Math.PI * p);
      const reach = Math.abs(edge - hinge);
      const soft = 0.3 * reach + 24;
      const right = edge >= hinge;
      const from = right ? hinge : Math.max(0, edge - soft);
      const to = right ? Math.min(o.W, edge + soft) : hinge;
      const at = `${(100 * reach) / Math.max(1, to - from)}%`;
      Object.assign(shadow.style, {
        left: `${from}px`,
        width: `${to - from}px`,
        background: `linear-gradient(${right ? 90 : 270}deg, rgba(45, 28, 6, 0.42), rgba(45, 28, 6, 0.16) ${at}, transparent)`,
        opacity: String(Math.sin(Math.PI * p)),
      });
      // In single-page view the page ends off to the left of the book: let it fade out as it goes.
      host.style.opacity = o.two ? "1" : String(p > 0.86 ? Math.max(0, (1 - p) / 0.14) : 1);
    },
  };
}
