## Spring Integration XML Visualizer

Web-based utility to display a Spring Integration XML as a flowchart graph.

Simply paste your SI XML(s) into the inputs, select the methods you want to display and navigate the Mermaid graph that represents them.

To use it, download all files and open `index.html` in the browser.

Note that at the moment the utility is very limited and untested: it **will not** cover all use cases. For example, it assumes all flows start with a `method` tag and it may not recognize all SI nodes.

This utility in based on:
- [Bootstrap](https://github.com/twbs/bootstrap)
- [Highlight.js](https://github.com/highlightjs/highlight.js)
- [Mermaid](https://github.com/mermaid-js/mermaid)
- [Panzoom](https://github.com/anvaka/panzoom)
- [SweetAlert2](https://github.com/sweetalert2/sweetalert2)
