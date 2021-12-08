
let currentXmlProcessor;

/**
 * Error handler for all main logic
 */
const onError = (error) => {

	console.error(error);
	currentXmlProcessor = undefined;
	View.displayError(error.message);
	View.clearExtraInputs();
	View.clearGraph();
};

/**
 * Callback for "Process XMLs" button
 */
const onProcessClick = () => {

	try {

		View.clearMessages();

		const xmlTexts = View.getInputXmlTexts();
		currentXmlProcessor = new SpringIntegrationXmlProcessor(xmlTexts);

		const currentMethodIds = View.getAvailableMethodIds();

		// If the (possibly new) XMLs have the same list of methods of the previous ones proceed to graph display, otherwise reload list of methods
		if(currentXmlProcessor.hasMethodIds(currentMethodIds)) {

			const selectedMethodIds = View.getSelectedMethodIds();
			if(selectedMethodIds.length === 0) {

				throw Error('No method selected!');
			}

			const graphBuilder = new MermaidGraphBuilder(selectedMethodIds, currentXmlProcessor);
			const graphDefinition = graphBuilder.getGraphDefinition();

			View.showGraph(graphDefinition);
		}
		else {

			View.clearGraph();
			View.clearExtraInputs();
			View.showExtraInputs(currentXmlProcessor);
		}
	}
	catch(error) {

		onError(error);
	}
};

/**
 * Callback for "+" button
 */
const onAddXmlInputClick = () => {

	try {

		View.addXmlInput();
	}
	catch(error) {

		onError(error);
	}
};

/**
 * Callback for clicks on Mermaid graph nodes (generic Spring Integration node)
 */
var onGraphNodeClick = (nodeId) => {

	try {

		View.showNodePopup(currentXmlProcessor, nodeId);
	}
	catch(error) {

		onError(error);
	}
};

/**
 * Callback for clicks on Mermaid graph nodes (Spring Integration method)
 */
var onGraphMethodClick = (nodeId) => {

	try {

		View.showMethodPopup(currentXmlProcessor, nodeId);
	}
	catch(error) {

		onError(error);
	}
};

mermaid.initialize({
	startOnLoad: true,
	securityLevel: 'loose'
});
