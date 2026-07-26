/**
 * Immutable scenario execution helpers.  Frames only contain a path into the
 * scene definition and an index; scenario node arrays are never stored or
 * mutated in game state.
 */
function nodesAt(scene, path = []) {
  let nodes = scene.nodes;
  for (let i = 0; i < path.length; i += 2) {
    const node = nodes[path[i]];
    nodes = node?.[path[i + 1]] || [];
  }
  return nodes;
}

export function createExecutionStack() { return [{ path: [], index: 0 }]; }

export function currentNode(scene, state) {
  const frame = state.executionStack.at(-1);
  return frame ? nodesAt(scene, frame.path)[frame.index] : null;
}

export function advanceExecution(state, scene) {
  const next = structuredClone(state);
  const stack = next.executionStack;
  if (!stack.length) return next;
  stack.at(-1).index += 1;
  while (stack.length) {
    const frame = stack.at(-1);
    if (frame.index < nodesAt(scene, frame.path).length) break;
    stack.pop();
    if (stack.length) stack.at(-1).index += 1;
  }
  return next;
}

export function enterBranch(state, scene, node, branchName) {
  const next = structuredClone(state);
  const parent = next.executionStack.at(-1);
  const branch = node[branchName] || [];
  if (branch.length) next.executionStack.push({ path: [...parent.path, parent.index, branchName], index: 0 });
  else return advanceExecution(next, scene);
  return next;
}

function collectLabels(nodes, path = [], found = []) {
  nodes.forEach((node, index) => {
    if (node.t === 'label') found.push({ id: node.id, path, index });
    if (node.t === 'if') {
      collectLabels(node.then || [], [...path, index, 'then'], found);
      collectLabels(node.else || [], [...path, index, 'else'], found);
    }
  });
  return found;
}

function stackForLabel(label) {
  const stack = [{ path: [], index: 0 }];
  for (let i = 0; i < label.path.length; i += 2) {
    stack.at(-1).index = label.path[i];
    stack.push({ path: label.path.slice(0, i + 2), index: 0 });
  }
  stack.at(-1).index = label.index;
  return stack;
}

export function gotoLabel(state, scene, id) {
  const label = collectLabels(scene.nodes).find((entry) => entry.id === id);
  if (!label) return { state, found: false };
  const next = structuredClone(state);
  next.executionStack = stackForLabel(label);
  return { state: advanceExecution(next, scene), found: true };
}

export function resetExecution(state) {
  return { ...structuredClone(state), executionStack: createExecutionStack() };
}
