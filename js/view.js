
/**
 * Class that contains helpers to interact with the HTML page, both to get input values and to display new information
 */
class View {

	static displayError(error) {

		View.#addMessage('#errors-section', '#errors-container', error);
	}
	
	static displayWarning(warning) {
	
		View.#addMessage('#warnings-section', '#warnings-container', warning);
	}

	static clearMessages() {

		View.#clearContainer('#errors-section', '#errors-container');
		View.#clearContainer('#warnings-section', '#warnings-container');
	}

	static getInputXmlTexts() {

		const textareas = document.querySelectorAll('#xml-textareas-container textarea');
	
		const xmlTexts = [];
	
		textareas.forEach((textarea, i) => {
	
			const xmlText = textarea.value;
			if(xmlText) {
		
				xmlTexts.push(xmlText);
			}
		});
	
		return xmlTexts;
	}

	static addXmlInput() {

		const firstTextareaContainer = document.querySelector("#first-xml-textarea-container");

		const textareaContainer = firstTextareaContainer.cloneNode(true);
		textareaContainer.removeAttribute('id');
		const textarea = textareaContainer.querySelector('textarea');
		textarea.value = '';

		const container = document.querySelector('#xml-textareas-container');
		container.appendChild(textareaContainer);
	}

	static showExtraInputs(xmlProcessor) {

		const methodIds = xmlProcessor.getMethodIds();

		const methodsSelectionContainer = document.querySelector('#methods-selection-container');
		for(const methodId of methodIds) {
	
			const method = xmlProcessor.getMethodById(methodId);
	
			const option = document.createElement('option');
			option.value = methodId;
			const text = document.createTextNode(method.name);
			option.appendChild(text);
			methodsSelectionContainer.appendChild(option);
		}
	
		View.#showElement('#extra-inputs-container');
	}

	static clearExtraInputs() {

		View.#hideElement('#extra-inputs-container');
		View.#emptyElement('#methods-selection-container');
	}

	static getAvailableMethodIds() {
	
		const options = [ ...document.querySelectorAll('#methods-selection-container option') ];
		return options.map((option) => {
			return option.value;
		});
	}
	
	static getSelectedMethodIds() {
	
		const methodsSelectionContainer = document.querySelector('#methods-selection-container');
		return [ ...methodsSelectionContainer.selectedOptions ].map((option) => {
			return option.value;
		});
	}

	static showGraph(graphDefinition) {

		View.#renderGraphSource(graphDefinition);
		View.#renderGraph(graphDefinition);
		View.#showElement('#graph-section');
		View.#showElement('#graph-source-section');
	}

	static clearGraph() {

		View.#hideElement('#graph-section');
		View.#hideElement('#graph-source-section');
		View.#emptyElement('#graph-container');
		View.#emptyElement('#graph-source-container');
	}

	static showNodePopup(xmlProcessor, nodeId) {

		const node = xmlProcessor.getNodeById(nodeId);
		if(!node) {

			throw Error(`Node ${nodeId} not found!`)
		}

		View.#showXmlPopup(`Node ${node.inputChannel} (${node.type})`, node.xmlText);
	}

	static showMethodPopup(xmlProcessor, nodeId) {

		const method = xmlProcessor.getMethodById(nodeId);
		if(!method) {

			throw Error(`Method ${nodeId} not found!`)
		}

		View.#showXmlPopup(`Method ${method.name}`, method.xmlText);
	}

	static #addMessage(sectionSelector, containerSelector, message) {

		View.#showElement(sectionSelector);
		
		const container = document.querySelector(containerSelector);
		const li = document.createElement('li');
		const text = document.createTextNode(message);
		li.appendChild(text);
		container.appendChild(li);
	}

	static #clearContainer(sectionSelector, containerSelector) {

		View.#hideElement(sectionSelector);
		View.#emptyElement(containerSelector);
	}

	static #renderGraphSource(graphDefinition) {

		const sourceContainer = View.#emptyElement('#graph-source-container');
		const pre = document.createElement('pre');
		const text = document.createTextNode(graphDefinition);
		pre.appendChild(text);
		sourceContainer.appendChild(pre);
	}

	static #renderGraph(graphDefinition) {
		
		// Request render to Mermaid
		mermaid.render('mermaid-graph-svg', graphDefinition, (svgGraph, bindFunctions) => {
	
			// Place computed SVG into its container
			const container = document.querySelector('#graph-container');
			container.innerHTML = svgGraph;
			bindFunctions(container);

			// Activate pan&zoom in the new SVG
			const svgElement = document.querySelector('#mermaid-graph-svg');
			panzoom(svgElement, {
				enableTextSelection: true,
				bounds: true,
				boundsPadding: 0.1,
				beforeWheel: (e) => {
					return !e.altKey;
				},
				zoomDoubleClickSpeed: 1
			});
		});
	}

	static #hideElement(selector) {
		
		const element = document.querySelector(selector);
		element.style.display = 'none';
		return element;
	}

	static #showElement(selector) {

		const element = document.querySelector(selector);
		element.style.display = null;
		return element;
	}

	static #emptyElement(selector) {

		const element = document.querySelector(selector);
		element.innerHTML = '';
		return element;
	}

	static #showXmlPopup(title, xmlText) {

		Swal.fire({
			title: title,
			html: hljs.highlight(xmlText, { language: 'xml', ignoreIllegals: true }).value,
			width: '80%',
			showConfirmButton: false,
			showClass: {
				backdrop: 'swal2-noanimation',
				popup: '',
				icon: ''
			},
			hideClass: {
				popup: '',
			}
		});
	}
}
