import { useState, useEffect, useRef } from 'react';
import { useLocation } from 'react-router-dom';
import Tree from 'react-d3-tree';
import DataTable from 'react-data-table-component';

// Constants
const MAX_NODE_WIDTH = 100;
const FONT_SIZE = 12;
const LINE_HEIGHT = 16;
const PADDING = 10;

let nodeIdCounter = 0;
// Word wrapping
const wrapText = (text, maxWidth, font = `${FONT_SIZE}px Arial`) => {
  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d');
  ctx.font = font;
  const words = text?.split(' ');
  let lines = [], currentLine = '';
  for (let word of words) {
    const testLine = currentLine ? `${currentLine} ${word}` : word;
    if (ctx.measureText(testLine).width > maxWidth && currentLine) {
      lines.push(currentLine);
      currentLine = word;
    } else currentLine = testLine;
  }
  if (currentLine) lines.push(currentLine);
  return lines;
};

// Render node
const renderNode = ({ nodeDatum }) => {
  const textLines = [];
  if (nodeDatum.name) textLines.push(...wrapText(nodeDatum.name, MAX_NODE_WIDTH));
  if (nodeDatum.attributes?.title) textLines.push(...wrapText(nodeDatum.attributes.title, MAX_NODE_WIDTH));
  if (nodeDatum.attributes?.location) textLines.push(...wrapText(nodeDatum.attributes.location, MAX_NODE_WIDTH));
  const totalHeight = textLines.length * LINE_HEIGHT + PADDING * 2;
  const width = MAX_NODE_WIDTH + PADDING * 2;
  return (
    <g>
      <rect width={width} height={totalHeight} x={-width / 2} y={-totalHeight / 2} fill="#e3f2fd" stroke="#2196f3" strokeWidth="2" rx="10" />
      {textLines.map((line, index) => (
        <text key={index} fill="#0d47a1" x={0} y={-totalHeight / 2 + PADDING + (index + 0.8) * LINE_HEIGHT} textAnchor="middle" fontSize={FONT_SIZE}>{line}</text>
      ))}
    </g>
  );
};

// Flatten
const flattenTree = (node, parentName = null, level = 0) => {
  const row = { id: node.id, name: node.name, parent: parentName, level, ...(node.attributes || {}) };
  let rows = [row];
  if (node.children) node.children.forEach(child => rows = rows.concat(flattenTree(child, node.name, level + 1)));
  return rows;
};

// Columns
const generateColumns = (flatData, addNode, deleteNode, editNode) => {
  const allKeys = new Set();
  flatData.forEach(row => Object.keys(row).forEach(key => allKeys.add(key)));
  const columns = Array.from(allKeys).map(key => ({
    name: key.charAt(0).toUpperCase() + key.slice(1),
    selector: row => row[key],
    sortable: true,
    wrap: true,
  }));
  columns.push({
    name: 'Actions',
    cell: row => (
      <>
        <button className='button button-edit' onClick={() => editNode(row.id)}>Edit</button>
        <button className='button button-add' onClick={() => addNode(row.id)}>Add</button>
        <button className='button button-delete' onClick={() => deleteNode(row.id)} >Delete</button>
      </>
    ),
    ignoreRowClick: true,
    allowOverflow: true,
    button: true,
  });
  return columns;
};

// ID assignment
const assignNodeIds = (node) => {
  node.id = nodeIdCounter++;
  if (node.children) node.children.forEach(assignNodeIds);
};

// Normalize
const normalizeTree = (node) => {
  if (node._children) {
    node.children = node._children;
    node._children = null;
  }
  if (node.children) node.children.forEach(normalizeTree);
};

// Tree layout estimation
const countDepth = (nodes) => {
  if (!nodes || nodes.length === 0) return 0;
  return 1 + Math.max(...nodes.map(n => n.children ? countDepth(n.children) : 0));
};
const countMaxSiblingsAtAnyLevel = (node, level = 0, levelMap = {}) => {
  levelMap[level] = (levelMap[level] || 0) + 1;
  if (node.children) node.children.forEach(child => countMaxSiblingsAtAnyLevel(child, level + 1, levelMap));
  return Math.max(...Object.values(levelMap));
};

// Main Component
const MyTree = () => {
  // const { id } = useParams();
  const location = useLocation();
  const [treeData, setTreeData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [filterText, setFilterText] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [modalParentId, setModalParentId] = useState(null);
  const [newNodeData, setNewNodeData] = useState({ name: '', title: '', location: '' });
  const [showEditModal, setShowEditModal] = useState(false);
  const [editNodeId, setEditNodeId] = useState(null);
  const [editNodeData, setEditNodeData] = useState({ name: '', title: '', location: '' });

  const treeContainerRef = useRef(null);
  const [translate, setTranslate] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);

  // Add node modal trigger
  const addNode = (parentId) => {
    setModalParentId(parentId);
    setNewNodeData({ name: '', title: '', location: '' });
    setShowModal(true);
  };

  const handleAddSubmit = () => {
    const fullName = newNodeData.name;

    const newNode = {
      id: nodeIdCounter++,
      name: fullName,
      children: [],
    };

    const insertNode = (node) => {
      if (node.id === modalParentId) {
        node.children = node.children || [];
        node.children.push(newNode);
        return true;
      }
      return node.children?.some(insertNode);
    };

    const updatedTree = [...treeData];
    updatedTree.forEach(insertNode);
    setTreeData(updatedTree);
    setShowModal(false);
  };


  // Delete node
  const deleteNode = (targetId) => {
    const remove = (nodes) => {
      return nodes
        .filter(n => n.id !== targetId)
        .map(n => ({ ...n, children: n.children ? remove(n.children) : [] }));
    };
    setTreeData(remove(treeData));
  };

  // Edit node modal trigger
  const editNode = (nodeId) => {
    // Find node in tree
    const findNode = (nodes) => {
      for (let node of nodes) {
        if (node.id === nodeId) return node;
        if (node.children) {
          const found = findNode(node.children);
          if (found) return found;
        }
      }
      return null;
    };
    const node = findNode(treeData);
    if (node) {
      setEditNodeId(nodeId);
      setEditNodeData({
        name: node.name || '',
        title: node.attributes?.title || '',
        location: node.attributes?.location || ''
      });
      setShowEditModal(true);
    }
  };

  // Edit node submit
  const handleEditSubmit = () => {
    const updateNode = (nodes) => {
      return nodes.map(node => {
        if (node.id === editNodeId) {
          return {
            ...node,
            name: editNodeData.name,
            attributes: {
              ...node.attributes,
              title: editNodeData.title,
              location: editNodeData.location
            }
          };
        } else if (node.children) {
          return { ...node, children: updateNode(node.children) };
        } else {
          return node;
        }
      });
    };
    setTreeData(prev => updateNode(prev));
    setShowEditModal(false);
  };

  useEffect(() => {
    const loadData = async () => {
      try {
        setLoading(true);
        setError(null);

        let processedData;

        // Use state data if available, otherwise fetch from API
        if (location.state?.processedData) {
          processedData = location.state.processedData;
          console.log('Using processed data from location state', processedData);
        }
       

        const finalTree = Array.isArray(processedData) ? processedData : [processedData];

        finalTree.forEach(assignNodeIds);
        finalTree.forEach(normalizeTree);
        setTreeData(finalTree);

        // Centering and zoom
        setTimeout(() => {
          if (treeContainerRef.current) {
            const { width, height } = treeContainerRef.current.getBoundingClientRect();
            const maxSiblings = finalTree.reduce((max, node) =>
              Math.max(max, countMaxSiblingsAtAnyLevel(node)), 0);
            const estimatedTreeWidth = (MAX_NODE_WIDTH + PADDING * 2 + 40) * maxSiblings;
            const estimatedTreeHeight = 150 * countDepth(finalTree);
            const scaleX = width / estimatedTreeWidth;
            const scaleY = height / estimatedTreeHeight;
            const scale = Math.min(scaleX, scaleY, 1);
            setZoom(scale);
            setTranslate({ x: width / 2, y: height / 4 });
          }
        }, 0);
      } catch (err) {
        setError(err.message || 'Failed to fetch company data');
      } finally {
        setLoading(false);
      }
    };
     loadData();
  }, [location.state]);

  if (loading) return <div>Loading...</div>;
  if (error) return <div>Error: {error}</div>;
  if (!treeData.length) return <div>No data available</div>;

  const flatData = treeData.map(node => flattenTree(node)).flat();
  const columns = generateColumns(flatData, addNode, deleteNode, editNode);
  const filteredData = flatData.filter(row =>
    Object.values(row).join(' ').toLowerCase().includes(filterText.toLowerCase())
  );

  return (
    <>

      {/* Modal */}
      {showModal && (
        <div className="mytree-modal-bg">
          <div className="mytree-modal-card">
            <h3>Add New Node</h3>
            <input
              className="mytree-input"
              placeholder="Full Name"
              value={newNodeData.name}
              onChange={e => setNewNodeData({ ...newNodeData, name: e.target.value })}
            />
            <button className="mytree-btn" onClick={handleAddSubmit}>Add</button>
            <button className="mytree-btn cancel" onClick={() => setShowModal(false)}>Cancel</button>
          </div>
        </div>
      )}

      {/* Edit Modal */}
      {showEditModal && (
        <div className="mytree-modal-bg">
          <div className="mytree-modal-card">
            <h3>Edit Node</h3>
            <input
              className="mytree-input"
              placeholder="Full Name"
              value={editNodeData.name}
              onChange={e => setEditNodeData({ ...editNodeData, name: e.target.value })}
            />
            <button className="mytree-btn" onClick={handleEditSubmit}>Save</button>
            <button className="mytree-btn cancel" onClick={() => setShowEditModal(false)}>Cancel</button>
          </div>
        </div>
      )}

      {/* Layout */}
      <div style={{ display: 'flex' }}>
        <div className="mytree-table-wrapper" style={{ width: '50%' }}>
          <input type="text" placeholder="Search" value={filterText} onChange={e => setFilterText(e.target.value)} />
          <DataTable title="Organization Table" columns={columns} data={filteredData} pagination highlightOnHover striped dense />
        </div>

        <div
          ref={treeContainerRef}
          style={{ width: '50%', height: '80vh', overflow: 'auto', display: 'flex', alignItems: 'center', justifyContent: 'center', borderLeft: '1px solid #ccc' }}
        >
          <Tree
            data={treeData}
            orientation="vertical"
            translate={translate}
            zoom={zoom}
            zoomable={true}
            scaleExtent={{ min: 0.1, max: 2 }}
            renderCustomNodeElement={renderNode}
            separation={{ siblings: 0.9, nonSiblings: 1.3 }}
            collapsible={false}
          />
        </div>
      </div>
    </>
  );
};

export default MyTree;
