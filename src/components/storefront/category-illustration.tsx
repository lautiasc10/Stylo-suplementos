// Ilustraciones decorativas de categorías: no representan productos reales ni marcas.
export function CategoryIllustration({ kind }: { kind: string }) {
  if (!["proteinas", "creatinas", "pre-entrenos"].includes(kind)) {
    return (
      <svg
        className="category-illustration"
        viewBox="0 0 320 240"
        aria-hidden="true"
        focusable="false"
      >
        <ellipse
          cx="160"
          cy="216"
          rx="66"
          ry="8"
          fill="#080808"
          opacity=".08"
        />
        {kind === "shakers-y-accesorios" ? (
          <>
            <path d="M113 58h94l-12 145q-35 16-70 0Z" fill="#080808" />
            <rect
              x="108"
              y="40"
              width="104"
              height="27"
              rx="8"
              fill="#DAAB4C"
            />
            <path
              d="M170 40V27h26v15"
              fill="none"
              stroke="#080808"
              strokeWidth="10"
              strokeLinejoin="round"
            />
            <path d="M126 91h68l-4 74h-60Z" fill="#DAAB4C" />
            <path
              d="M152 107h24m-24 18h18m-18 18h24"
              stroke="#080808"
              strokeWidth="4"
            />
          </>
        ) : (
          <>
            <rect
              x="94"
              y="52"
              width="132"
              height="156"
              rx="16"
              fill="#080808"
            />
            <path d="M94 83h132v72H94Z" fill="#DAAB4C" />
            <path d="M123 108h74m-57 18h40" stroke="#080808" strokeWidth="4" />
            <path d="M114 183h92" stroke="#FFFFFF" strokeOpacity=".3" />
          </>
        )}
      </svg>
    );
  }
  const pouch = kind === "pre-entrenos";
  const compact = kind === "creatinas";
  return (
    <svg
      className="category-illustration"
      viewBox="0 0 320 240"
      aria-hidden="true"
      focusable="false"
    >
      <ellipse
        cx="160"
        cy="216"
        rx={pouch ? 71 : 66}
        ry="8"
        fill="#080808"
        opacity=".08"
      />
      {pouch ? (
        <>
          <path
            d="M105 27h110l-6 28 19 148q-68 17-136 0L111 55Z"
            fill="#080808"
          />
          <path d="M105 27h110v10H105Z" fill="#DAAB4C" />
          <path d="M112 48h96" stroke="#FFFFFF" strokeOpacity=".3" />
          <path d="M108 88h104l7 90H101Z" fill="#DAAB4C" />
          <path
            d="M128 119h64m-64 10h64m-52 11h40"
            stroke="#080808"
            strokeWidth="5"
          />
          <path d="M114 191h92" stroke="#FFFFFF" strokeOpacity=".35" />
          <text
            x="160"
            y="108"
            textAnchor="middle"
            fill="#080808"
            fontFamily="Inter, sans-serif"
            fontSize="10"
            fontWeight="600"
          >
            PRE-ENTRENO
          </text>
        </>
      ) : (
        <g transform={compact ? "translate(0 33)" : undefined}>
          <rect
            x={compact ? 99 : 101}
            y="42"
            width={compact ? 122 : 118}
            height={compact ? 128 : 161}
            rx="21"
            fill="#080808"
          />
          <rect
            x={compact ? 96 : 98}
            y="26"
            width={compact ? 128 : 124}
            height="31"
            rx="8"
            fill="#080808"
          />
          <path
            d="M111 33v16m8-16v16m8-16v16m8-16v16m8-16v16m8-16v16m8-16v16m8-16v16m8-16v16m8-16v16m8-16v16m8-16v16m8-16v16"
            stroke="#FFFFFF"
            strokeOpacity=".2"
            strokeWidth="2"
          />
          <path
            d={compact ? "M100 91h120v55H100Z" : "M102 97h116v75H102Z"}
            fill="#DAAB4C"
          />
          <text
            x="160"
            y={compact ? 115 : 123}
            textAnchor="middle"
            fill="#080808"
            fontFamily="Montserrat, sans-serif"
            fontSize={compact ? 12 : 13}
            fontWeight="700"
          >
            {compact ? "CREATINA" : "PROTEÍNA"}
          </text>
          <path
            d={compact ? "M125 128h70" : "M123 141h74m-60 12h46"}
            stroke="#080808"
            strokeWidth="3"
          />
          <path
            d={compact ? "M115 158h90" : "M116 187h88"}
            stroke="#FFFFFF"
            strokeOpacity=".3"
          />
          <path
            d={compact ? "M109 65v14" : "M111 70v16"}
            stroke="#FFFFFF"
            strokeOpacity=".2"
            strokeWidth="3"
            strokeLinecap="round"
          />
        </g>
      )}
    </svg>
  );
}
