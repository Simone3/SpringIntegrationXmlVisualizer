
/**
 * Class that parses the Spring Integration XML and then allows to query the results via public methods,
 * e.g. to get the list of methods, to get a node by input channel, etc.
 */
class SpringIntegrationXmlProcessor {

	#methodIds;
	#methodsByIdMap;
	#methodsByNameMap;
	#nodesByIdMap;
	#nodesByInputChannelMap;
	#currentMethodCounter;
	#currentNodeCounter;

	constructor(xmlTexts) {

		this.#methodIds = [];
		this.#methodsByIdMap = {};
		this.#methodsByNameMap = {};
		this.#nodesByIdMap = {};
		this.#nodesByInputChannelMap = {};
		this.#currentMethodCounter = 0;
		this.#currentNodeCounter = 0;

		if(xmlTexts.length === 0) {
	
			throw Error('No XML provided!');
		}
	
		for(let i = 0; i < xmlTexts.length; i++) {
	
			this.#processXml(i, xmlTexts[i]);
		}
	
		if(this.#methodIds.length === 0) {
	
			throw Error('No method found!');
		}
	}

	getMethodIds() {

		return Object.freeze(this.#methodIds);
	}

	getMethodById(methodId) {

		return this.#methodsByIdMap[methodId];
	}

	getMethodByName(methodName) {

		return this.#methodsByNameMap[methodName];
	}

	getNodeById(nodeId) {

		return this.#nodesByIdMap[nodeId];
	}

	getNodeByInputChannel(inputChannel) {

		return this.#nodesByInputChannelMap[inputChannel];
	}
	
	hasMethodIds(compareMethodIds) {

		if(this.#methodIds.length !== compareMethodIds.length) {

			return false;
		}

		for(let i = 0; i < compareMethodIds.length; i++) {

			if(this.#methodIds[i] !== compareMethodIds[i]) {
	
				return false;
			}
		}
	
		return true;
	}

	#processXml(xmlId, xmlText) {

		const xml = this.#parseXml(xmlText);
	
		const rootXmlNode = xml.firstChild;
		for(const xmlNode of rootXmlNode.childNodes) {
	
			const xmlNodeName = this.#getXmlNodeName(xmlNode);
	
			switch(xmlNodeName) {
	
				case '#text':
				case '#comment':
				case 'channel':
				case 'errorwrapper':
				case 'bean':
				case 'import':
				case 'client':
					break;
	
				case 'gateway':
					this.#addMethods(xmlId, xmlNode);
					break;
	
				case 'transformer':
				case 'service-activator':
				case 'splitter':
				case 'aggregator':
				case 'header-enricher':
				case 'chain':
					this.#addSimpleInputNode(xmlId, xmlNode);
					break;
	
				case 'router':
					this.#addRouterInputNode(xmlId, xmlNode);
					break;
	
				default:
					throw Error(`Unknown node: ${xmlNode.outerHTML}`);
			}
		}
	}

	#parseXml(xmlText) {

		const parser = new DOMParser();
		const parsedResult = parser.parseFromString(xmlText, 'text/xml');
		const errorNode = parsedResult.querySelector('parsererror');
		if(errorNode) {
			
			throw Error(`Cannot parse XML: ${xmlText}`);
		}
		else {
			
			return parsedResult;
		}
	}

	#getXmlNodeName(xmlNode) {

		let xmlNodeName = xmlNode.nodeName;
		if(xmlNodeName.includes(':')) {
	
			xmlNodeName = xmlNodeName.split(':')[1];
		}
		return xmlNodeName;
	}
	
	#addMethods(xmlId, methodsContainerXmlNode) {
	
		for(const childXmlNode of methodsContainerXmlNode.childNodes) {
	
			if(this.#getXmlNodeName(childXmlNode) === 'method') {
	
				const methodName = childXmlNode.getAttribute('name');
				if(!methodName) {
	
					throw Error(`Node ${childXmlNode.outerHTML} does not have a method name!`);
				}

				const methodChannel = childXmlNode.getAttribute('request-channel');
				if(!methodChannel) {
	
					throw Error(`Node ${childXmlNode.outerHTML} does not have a method channel!`);
				}
	
				if(this.#methodsByNameMap[methodName]) {
	
					throw Error(`Method ${methodName} is repeated!`);
				}

				const methodId = `M${this.#currentMethodCounter}`;
				this.#currentMethodCounter += 1;
				const method = new SpringIntegrationMethod(methodId, xmlId, methodName, childXmlNode.outerHTML, methodChannel);

				this.#methodIds.push(methodId);
				this.#methodsByIdMap[methodId] = method;
				this.#methodsByNameMap[methodName] = method;
			}
		}
	}
	
	#addSimpleInputNode(xmlId, xmlNode) {
	
		const outputChannel = xmlNode.getAttribute('output-channel');
		this.#addInputNode(xmlId, xmlNode, outputChannel ? [ outputChannel ] : []);
	}
	
	#addRouterInputNode(xmlId, xmlNode) {
		
		const expression = xmlNode.getAttribute('expression');
		if(!expression) {
	
			throw Error(`Node ${xmlNode.outerHTML} does not have an expression!`);
		}
	
		const outputChannels = this.#getOutputChannelsFromExpression(expression);
		if(outputChannels.length === 0) {
	
			throw Error(`Error parsing expression "${expression}": no output channels found!`);
		}
	
		this.#addInputNode(xmlId, xmlNode, outputChannels);
	}

	#addInputNode(xmlId, xmlNode, outputChannels) {
	
		const inputChannel = xmlNode.getAttribute('input-channel');
		if(!inputChannel) {
	
			throw Error(`Node ${xmlNode.outerHTML} does not have an input channel!`);
		}
	
		const failsafeOutput = xmlNode.getAttribute('failsafe-outputchannel');
		if(failsafeOutput && !outputChannels.includes(failsafeOutput)) {
	
			outputChannels.push(failsafeOutput);
		}

		if(this.#nodesByInputChannelMap[inputChannel]) {
	
			View.displayWarning(`Input channel ${inputChannel} is not unique! Only the first one was added.`);
			return;
		}

		const nodeId = `N${this.#currentNodeCounter}`;
		this.#currentNodeCounter += 1;
		const xmlNodeName = this.#getXmlNodeName(xmlNode);
		const node = new SpringIntegrationNode(nodeId, xmlId, xmlNodeName, xmlNodeName, xmlNode.outerHTML, inputChannel, outputChannels);

		this.#nodesByIdMap[nodeId] = node;
		this.#nodesByInputChannelMap[inputChannel] = node;
	}
	
	#getOutputChannelsFromExpression(expression) {
	
		const outputChannels = [];
	
		let inString = false;
		let current = '';
		for(const char of expression) {
	
			if(char === '?' && !inString) {
	
				current = '';
			}
			else if(char === ':' && !inString) {
	
				this.#addOutputChannelFromExpressionValue(outputChannels, expression, current);
				current = '';
			}
			else {
	
				if(char === '\'') {
	
					inString = !inString;
				}
	
				current += char;
			}
		}
	
		this.#addOutputChannelFromExpressionValue(outputChannels, expression, current);
	
		return outputChannels;
	}
	
	#addOutputChannelFromExpressionValue(outputChannels, expression, expressionValue) {
	
		const outputChannelsInValue = [];

		const outputChannelsMatches = [ ...expressionValue.matchAll(/'([^']+)'/g) ];

		if(outputChannelsMatches.length > 0) {

			if(outputChannelsMatches.length > 1) {

				View.displayWarning(`Unexpected multiple output channels in sub-expression: ${expressionValue.trim()} of ${expression}. This may be a bug.`);
			}

			for(const outputChannelsMatch of outputChannelsMatches) {
	
				if(outputChannelsMatch.length != 1 && !outputChannelsMatch[1]) {
		
					throw Error(`Error parsing expression "${expression}": invalid output channel name in expression value`);
				}
		
				outputChannelsInValue.push(outputChannelsMatch[1]);
			}
		}
		else {

			View.displayWarning(`Cannot find any output channel as a string in sub-expression: ${expressionValue.trim()} of ${expression}. This may be a bug or a dynamic output channel computation. If it is a dynamic computation, maybe you can manually modify the XML and replace it with fixed values?`);

			outputChannelsInValue.push(expressionValue.trim());
		}
	
		for(const outputChannel of outputChannelsInValue) {

			if(!outputChannels.includes(outputChannel)) {
	
				outputChannels.push(outputChannel);
			}
		}
	}
}

class SpringIntegrationMethod {

	#id;
	#xmlId;
	#name;
	#xmlText;
	#channel;

	constructor(id, xmlId, name, xmlText, channel) {

		this.#id = id;
		this.#xmlId = xmlId;
		this.#name = name;
		this.#xmlText = xmlText;
		this.#channel = channel;
	}

	get id() {

		return this.#id;
	}

	get xmlId() {
		
		return this.#xmlId;
	}

	get name() {
		
		return this.#name;
	}

	get xmlText() {
		
		return this.#xmlText;
	}

	get channel() {
		
		return this.#channel;
	}
}

class SpringIntegrationNode {

	#id;
	#xmlId;
	#type;
	#name;
	#xmlText;
	#inputChannel;
	#outputChannels;

	constructor(id, xmlId, type, name, xmlText, inputChannel, outputChannels) {

		this.#id = id;
		this.#xmlId = xmlId;
		this.#type = type;
		this.#name = name;
		this.#xmlText = xmlText;
		this.#inputChannel = inputChannel;
		this.#outputChannels = outputChannels;
	}

	get id() {
		
		return this.#id;
	}

	get xmlId() {
		
		return this.#xmlId;
	}

	get type() {
		
		return this.#type;
	}

	get name() {
		
		return this.#name;
	}

	get xmlText() {
		
		return this.#xmlText;
	}

	get inputChannel() {
		
		return this.#inputChannel;
	}

	get outputChannels() {
		
		return this.#outputChannels;
	}
}
