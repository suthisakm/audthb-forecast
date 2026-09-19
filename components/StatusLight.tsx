// A small marker dot beside a card's own title -- replaces the colored
// top-border "accent stripe" convention (a
// well-known AI-generated-UI tell: a thick single-side border clashing
// with a rounded card corner). One lit dot beside the card's own title
// reads as "this panel is live and belongs to this category" without the
// racing-stripe effect. Plain filled dot, no glow -- a glow here would be
// decoration standing in for depth, which this system's Elevation rule
// (flat by design, depth from borders/surface steps only) already rules
// out everywhere else.
export default function StatusLight({ colorClassName }: { colorClassName: string }) {
  return <span className={`inline-block h-2 w-2 rounded-full bg-current mr-2 ${colorClassName}`} />;
}
