// Tuzilma sxemasi — web v2 OrgChart tugun/bog'lanishlari mobil'da chizilgan
// grafik emas, chuqurlik bo'yicha suriladigan DARAXT sifatida (telefon eni).
// Kirish bog'lanishi yo'q tugun — ildiz; bolalar `outgoing_connections` dan.
// Sxema qo'lda chiziladi, shuning uchun tsikl va yetim bog'lanish bo'lishi mumkin:
// har tugun bir marta chiqadi, hech biri yo'qolmaydi.
import type { HierarchyNode } from '../api/queries';

export interface TreeNode {
  node: HierarchyNode;
  children: TreeNode[];
}

export function buildTree(nodes: HierarchyNode[]): TreeNode[] {
  const byId = new Map(nodes.map((n) => [n.id, n]));
  const hasParent = (n: HierarchyNode) => (n.incoming_connections ?? []).some((c) => byId.has(c.source_id) && c.source_id !== n.id);
  const visited = new Set<number>();

  const build = (n: HierarchyNode): TreeNode => {
    visited.add(n.id);
    const children: TreeNode[] = [];
    for (const c of n.outgoing_connections ?? []) {
      const child = byId.get(c.target_id);
      if (child && !visited.has(child.id)) children.push(build(child));
    }
    return { node: n, children };
  };

  const roots: TreeNode[] = [];
  for (const n of nodes) if (!hasParent(n) && !visited.has(n.id)) roots.push(build(n));
  // Butunlay tsiklda qolgan tugunlar (ildizi yo'q) — ular ham ko'rinsin.
  for (const n of nodes) if (!visited.has(n.id)) roots.push(build(n));
  return roots;
}

export function flattenTree(roots: TreeNode[], depth = 0): { node: HierarchyNode; depth: number }[] {
  return roots.flatMap((r) => [{ node: r.node, depth }, ...flattenTree(r.children, depth + 1)]);
}
