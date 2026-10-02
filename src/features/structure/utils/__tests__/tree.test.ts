import { buildTree, flattenTree } from '../tree';
import type { HierarchyNode } from '../../api/queries';

const conn = (source_id: number, target_id: number) => ({ id: source_id * 100 + target_id, source_id, target_id });
const node = (id: number, name: string, out: number[] = [], inc: number[] = []): HierarchyNode => ({
  id,
  name,
  outgoing_connections: out.map((t) => conn(id, t)),
  incoming_connections: inc.map((s) => conn(s, id)),
});

describe('buildTree (v2 OrgChart ierarxiyasi → mobil daraxt)', () => {
  it("kirish bog'lanishi yo'q tugun — ildiz; bolalar outgoing bo'yicha", () => {
    const roots = buildTree([node(1, 'Rais', [2, 3]), node(2, 'Kadrlar', [], [1]), node(3, 'Moliya', [4], [1]), node(4, 'Buxgalteriya', [], [3])]);
    expect(roots.map((r) => r.node.name)).toEqual(['Rais']);
    expect(roots[0].children.map((c) => c.node.name)).toEqual(['Kadrlar', 'Moliya']);
    expect(roots[0].children[1].children[0].node.name).toBe('Buxgalteriya');
  });

  it("tsikl — har tugun bir marta, cheksiz rekursiya yo'q", () => {
    const roots = buildTree([node(1, 'A', [2]), node(2, 'B', [1], [1])]);
    const flat = flattenTree(roots);
    expect(flat.map((f) => f.node.name).sort()).toEqual(['A', 'B']);
  });

  it("hammasi tsiklda (ildiz yo'q) — baribir ko'rinadi", () => {
    const roots = buildTree([node(1, 'A', [2], [2]), node(2, 'B', [1], [1])]);
    expect(flattenTree(roots)).toHaveLength(2);
  });

  it("yo'q tugunga bog'lanish e'tiborsiz; bog'lanmagan tugun — alohida ildiz", () => {
    const roots = buildTree([node(1, 'A', [99]), node(5, 'Yolg\'iz')]);
    expect(roots.map((r) => r.node.name)).toEqual(['A', "Yolg'iz"]);
    expect(roots[0].children).toHaveLength(0);
  });

  it('flattenTree — chuqurlik bilan', () => {
    const flat = flattenTree(buildTree([node(1, 'A', [2]), node(2, 'B', [3], [1]), node(3, 'C', [], [2])]));
    expect(flat.map((f) => [f.node.name, f.depth])).toEqual([
      ['A', 0],
      ['B', 1],
      ['C', 2],
    ]);
  });
});
