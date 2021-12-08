
/**
 * Class that builds a Mermaid flowchart based on the SpringIntegrationXmlProcessor results
 */
class MermaidGraphBuilder {

	#selectedMethodIds;
	#xmlProcessor;
	#processedNodes;
	#currentNotFoundNodeCounter;
	#notFoundNodesMap;
	#nodesQueue;
	#nodeDefinitionsByGroup;
	#edgeDefinitions;
	#classDefinitions;
	#clickDefinitions;
	#fullGraph;

	constructor(selectedMethodIds, xmlProcessor) {

		this.#selectedMethodIds = selectedMethodIds;
		this.#xmlProcessor = xmlProcessor;

		this.#processedNodes = {};
		this.#currentNotFoundNodeCounter = 0;
		this.#notFoundNodesMap = {};
		this.#nodesQueue = [];

		this.#nodeDefinitionsByGroup = { byXmlId: [], ungrouped: [] };
		this.#edgeDefinitions = [];
		this.#classDefinitions = [];
		this.#clickDefinitions = [];
		this.#fullGraph = '';

		this.#buildGraph();
	}

	getGraphDefinition() {

		return this.#fullGraph;
	}

	#buildGraph() {

		for(const methodId of this.#selectedMethodIds) {

			this.#processMethod(methodId);
			this.#dequeueNodes();
		}

		this.#finalizeGraph();
	}

	#processMethod(methodId) {

		const method = this.#xmlProcessor.getMethodById(methodId);

		this.#addNodeDefinition(methodId, `[method] ${method.name}`, method.xmlId);
		this.#addClassDefinition(methodId, 'node-method');
		this.#addClickDefinition(methodId, 'onGraphMethodClick');

		const methodStartNode = this.#xmlProcessor.getNodeByInputChannel(method.channel);
		if(methodStartNode) {

			this.#addEdgeDefinition(methodId, methodStartNode.id);
			this.#nodesQueue.push(methodStartNode);
		}
		else {

			this.#addNotFoundNode(methodId, method.channel);
		}
	}

	#dequeueNodes() {

		while(this.#nodesQueue.length > 0) {

			const node = this.#nodesQueue.shift();
			const nodeId = node.id;

			if(this.#processedNodes[nodeId]) {

				continue;
			}

			this.#processedNodes[nodeId] = true;

			this.#addNodeDefinition(nodeId, `[${node.type}] ${node.inputChannel}`, node.xmlId);
			this.#addClassDefinition(nodeId, `node-${node.type}`);
			this.#addClickDefinition(nodeId, 'onGraphNodeClick');

			for(const outputChannel of node.outputChannels) {

				const childNode = this.#xmlProcessor.getNodeByInputChannel(outputChannel);

				if(childNode) {

					this.#addEdgeDefinition(nodeId, childNode.id);
					this.#nodesQueue.push(childNode);
				}
				else {

					this.#addNotFoundNode(nodeId, outputChannel);
				}
			}
		}
	}

	#finalizeGraph() {

		this.#fullGraph = 'graph TD';

		this.#concatNodeDefinitionsToFullGraph();
		this.#concatDefinitionsToFullGraph(this.#edgeDefinitions, 'EDGES');
		this.#concatDefinitionsToFullGraph(this.#classDefinitions, 'CLASSES');
		this.#concatDefinitionsToFullGraph(this.#clickDefinitions, 'CLICKS');
	}

	#addNotFoundNode(sourceNodeId, targetNodeChannel) {

		let notFoundNodeId = this.#notFoundNodesMap[targetNodeChannel];
		if(notFoundNodeId === undefined) {

			notFoundNodeId = `NF${this.#currentNotFoundNodeCounter}`;
			this.#currentNotFoundNodeCounter += 1;
			this.#notFoundNodesMap[targetNodeChannel] = notFoundNodeId;

			this.#addNodeDefinition(notFoundNodeId, `!!! NOT FOUND !!! ${targetNodeChannel}`);
			this.#addClassDefinition(notFoundNodeId, 'node-not-found');

			View.displayWarning(`There is no node with ${targetNodeChannel} as input channel. Maybe you need to import another XML?`)
		}

		this.#addEdgeDefinition(sourceNodeId, notFoundNodeId);
	}

	#addNodeDefinition(nodeId, nodeLabel, xmlId) {

		const definition = `${nodeId}["${nodeLabel}"]`;

		if(xmlId === undefined) {

			this.#nodeDefinitionsByGroup.ungrouped.push(definition);
		}
		else {

			let xmlIdArray = this.#nodeDefinitionsByGroup.byXmlId[xmlId];
			if(!xmlIdArray) {

				xmlIdArray = [];
				this.#nodeDefinitionsByGroup.byXmlId[xmlId] = xmlIdArray;
			}
			xmlIdArray.push(definition);
		}
	}

	#addClassDefinition(nodeId, cssClass) {

		this.#classDefinitions.push(`class ${nodeId} ${cssClass}`);
	}

	#addClickDefinition(nodeId, jsCallback) {

		this.#clickDefinitions.push(`click ${nodeId} ${jsCallback}`);
	}

	#addEdgeDefinition(sourceNodeId, targetNodeId) {

		this.#edgeDefinitions.push(`${sourceNodeId} ---> ${targetNodeId}`);
	}

	#concatNodeDefinitionsToFullGraph() {

		const xmlIdArrays = this.#nodeDefinitionsByGroup.byXmlId;
		for(let i = 0; i < xmlIdArrays.length; i++) {

			this.#concatDefinitionsToFullGraph(xmlIdArrays[i], `NODES - XML ${i}`, `subgraph "XML ${i}"`, 'end');
		}

		const ungroupedArray = this.#nodeDefinitionsByGroup.ungrouped;
		this.#concatDefinitionsToFullGraph(ungroupedArray, `NODES - UNGROUPED`);
	}

	#concatDefinitionsToFullGraph(definitions, comment, prefixRow, suffixRow) {

		if(definitions && definitions.length > 0) {

			if(comment) {

				this.#fullGraph += `\n%% ---------- START ${comment} ----------`;
			}

			if(prefixRow) {

				this.#fullGraph += `\n${prefixRow}`;
			}

			this.#fullGraph += `\n${definitions.join(';\n')};`;

			if(suffixRow) {

				this.#fullGraph += `\n${suffixRow}`;
			}

			if(comment) {

				this.#fullGraph += `\n%% ---------- END ${comment} ----------`;
			}
		}
	}
}
