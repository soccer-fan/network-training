class NetworkNode {
    ip = null;
    MAC = null;
    image = null;
    subnet_mask = null;
    default_gateway = null;
    neighbour = null;
    log = "";

    constructor(name, MAC) {
        this.name = name;
        this.MAC = MAC;
    }

    ipconfig() {
    	var startline = 'Windows IP Configuration\n\n';
    	var adapterline = 'Ethernet Adapter Ethernet:\n\n';
    	var ipline = '';
    	var subnetline = '';
    	var gatewayline = '';

    	if(this.ip == null) {
    		ipline = 'IPv4 Address.................Not specified\n';
    	} else {
    		ipline = 'IPv4 Address.................' + this.ip + '\n';
    	}

    	if(this.subnet_mask == null) {
    		subnetline = 'Subnet Mask..................Not specified\n';
    	} else {
    		subnetline = 'Subnet Mask..................' + this.subnet_mask + '\n';
    	}

    	if(this.default_gateway == null) {
    		gatewayline = 'Default gateway..............Not specified\n';
    	} else {
    		gatewayline = 'Default gateway..............' + this.default_gateway + '\n';
    	}

    	return startline + adapterline + ipline + subnetline + gatewayline;
    	
    }


    renew_dhcp() {
    	if(this.neighbour) {
    		console.log('sending info');
    		this.neighbour.handle_message('renew_dchp', this.ip, '', null); //not getting sent to router
    	}
    }

    connect(node) {
    	if(this.neighbour) {
    		if(this.neighbour == node) {
    			//already connected
    			this.write_info("Error: already connected to " + node.name);
    		} else {
    			//connected to something else
    			this.write_info("Error: all connections full");
    		}
    	} else {
    		this.neighbour = node;
    		this.write_info("Connected to " + node.name);
    	}
    	
    }

    disconnect(node) {
		let neighbour = this.neighbour;
		this.neighbour = null;
		if(neighbour) {
			this.write_info('Disconnected from ' + neighbour.name);
		} else {
			//not connected anyways
		}
		
	}

    handle_message(message, sender, destination, content=null) {
    	console.log('parent class handle message');
    	if(message == 'dhcp_info') {
    		this.ip = content[0];
    		this.subnet_mask = content[1];
    		this.default_gateway = content[2];
    		this.write_info('DHCP Lease Renewed \n');
    	}
    }

    route_packet(destination) {
    	//if 
    }


    write_info(text) {
    	let date = new Date();
    	let timestamp = "[" + date.getHours() + ":" + date.getMinutes() + ":" + date.getSeconds() + "] ";
    	let formatted_info = timestamp + text + '\n'
    	this.log += formatted_info
    }

    load_log() {
    	$('#log').html(this.log);
    }

    render() {
    	let html = '<div class="col-3"><div class="network-node" id="' + this.name + '"><h5>' + this.constructor.name + '</h5><img src="/static/images/' + this.image + '"/><h5>' + this.name + '</h5></div></div>';
    	return html;
    }

    generate_menu() {
    	let html = "";

    	//provide buttons for available actions
    	html += "<h3>Available commands:</h3>"
    	html += "<button id='ipconfig-button' class='btn btn-primary' type='button'>IP Config</button><br/>";
    	html += "<button id='renew-button' class='btn btn-primary' type='button'>Renew DHCP</button><br/>";
    	
    	return html;
    }

    hook_menu() {
    	//hook own generated menu buttons
    	let self = this; //obj reference for in callback
    	$('#ipconfig-button').click(function() {
    		self.write_info(self.ipconfig());
    		self.load_log();
    	});
    	$('#renew-button').click(function() {
    		self.renew_dhcp();
    		self.load_log();
    	});
    }



}

class Desktop extends NetworkNode {
	

	constructor(name) {
		super(name);
		this.image = 'desktop.jpg';
	}

}

class Router extends NetworkNode {
	dhcp_start = null;
	dhcp_end = null;
	dhcp_counter = 0;
	neighbours = [];

	constructor(name, MAC, ip, subnet_mask) {
		super(name, MAC);
		this.ip = ip;
		this.subnet_mask = subnet_mask;
		this.image = 'router.png';

		let parts = this.ip.split('.');
		let last = parts[3];
		this.dhcp_start = parts[0] + '.' + parts[1] + '.' + parts[2] + '.' + (parseInt(parts[3]) + 10);
		this.dhcp_end = parts[0] + '.' + parts[1] + '.' + parts[2] + '.' + (parseInt(parts[3]) + 50);
	}

	connect(node) {
		if(this.neighbours.indexOf(node) != -1) {
			//already connected
			this.write_info("Error: already connected to " + node.name);
		} else {
			this.neighbours.push(node);
			this.write_info("Connected to " + node.name);
		}
		
	}

	disconnect(node) {
		let index = this.neighbours.indexOf(node);
		if(index != -1) {
			//currently connected
			console.log('Disconnecting node at ' + index);
			this.neighbours.splice(index, 1);
			
			this.write_info("Disconnected from " + node.name);
		} else {
			this.write_info("Not connected to " + node.name);
		}
		
	}



	handle_message(message, sender, destination, content=null) {
		if(message == 'renew_dhcp') {
			console.log('Handling renew dhcp request');
			let parts = this.dhcp_start.split('.');
			let last = parseInt(parts[3]) + this.dhcp_counter;
			this.dhcp_counter++;
			let assigned_address = parts[0] + '.' + parts[1] + '.' + parts[2] + '.' + last;
			let return_info = [assigned_address, this.subnet_mask, this.default_gateway];

			if(sender.split('.').length != 4) {
				//sent with MAC
				for(let i = 0; i < this.neighbours.length; i++) {
					if(neighbours[i].MAC == sender) {
						neighbours[i].handle_message('dhcp_info', this.ip, sender, return_info);
					}
				}
			} else {
				//sent with IP
				for(let i = 0; i < this.neighbours.length; i++) {
					if(neighbours[i].IP == sender) {
						neighbours[i].handle_message('dhcp_info', this.ip, sender, return_info);
					}
				}
			}
		}
	}
}

class Model {

	nodes = []

	constructor() {
		//do nothing
	}

	add_node(node) {
		this.nodes.push(node);
	}

	hook_nodes() {
		let self = this; //objct reference to use in callback

		//add event listener to each node
		$('.network-node').click(function() {
				//highlight clicked node
				$('.clicked-node').addClass('network-node');
				$('.clicked-node').removeClass('clicked-node');

				$(this).removeClass('network-node');
				$(this).addClass('clicked-node');


				//create contex window
				self.render_menu();
		});
	}

	render_nodes() {
		let num_nodes = this.nodes.length;
		let index = 0;
		let html = "<div class='row'>";
		while(index < num_nodes	) {
			html += this.nodes[index].render();
			index++;
		}
		html += '</div>';
		$('.network-pane').html(html);
	}

	render_menu() {
		let self = this; //so we can reference obj inside callbacks
		//find the active node
		let $clicked_node = $('.clicked-node');
		console.log($clicked_node);
		if($clicked_node.length == 0) {
			$('#context-menu').html("<h2>Click on a network node to interact with it</h2>");
		} else {
			let id = $clicked_node.attr('id');
			if(id) {
				let node = this.find_node(id);
				console.log(id);
				if(node) {
					node.load_log(); //load relevant log history
					let menu = node.generate_menu(); //raw html string

					if(this.nodes.length < 2) {
			    		$('#context-menu').html(menu);
			    		node.hook_menu();
			    		return;
			    	}


					//generates html for context menu
			    	let html = "<h3>Connections:</h3><br/>";

			    	if(node.neighbours && node.neighbours.length > 0) { //if a router or similar
			    		
			    		for(var index in node.neighbours) {
			    			console.log(node.neighbours[index].name);
			    			html += "<div><h5 class='inline-heading'>" + node.neighbours[index].name + "</h5><button class='btn btn-danger disconnect-button' type='button'>Disconnect</button></div>";
			    		}
			    	} else if(node.neighbour) {
			    		html += "<div><h5 class='inline-heading'>" + node.neighbour.name + "</h5><button class='btn btn-danger disconnect-button' type='button'>Disconnect</button><div>";
			    	} else {
			    		html += "<h5>Nothing connected</h5>";
			    	}

			    	html += "<br/>";
			    	html += "<h3>Connect to another node:</h3>";

			    	//list nodes to be connected to
			    	for(var i = 0; i < this.nodes.length; i++) {
			    		if(this.nodes[i] != node) {
			    			html += "<div><h5 class='inline-heading'>" + this.nodes[i].name + "</h5><button class='btn btn-danger connect-button' type='button'>Connect</button></div><br/>";
			    		}
			    	}


			    	$('#context-menu').html(menu + html);
			    	node.hook_menu();

			    	//hook connect/disconnect buttons
			    	$('.connect-button').click(function() {
			    		let node_name = $(this).parent().children("h5").html();
			    		let node_to_connect = self.find_node(node_name);
			    		if(node_to_connect) {
			    			node.connect(node_to_connect);
			    			node_to_connect.connect(node);
			    			node.load_log();
			    			
			    		}
			    		self.render_menu();
			    	});

			    	$('.disconnect-button').click(function() {
			    		let node_name = $(this).parent().children("h5").html();
			    		let node_to_disconnect = self.find_node(node_name);
			    		if(node_to_disconnect) {
			    			node.disconnect(node_to_disconnect);
			    			node_to_disconnect.disconnect(node);
			    			node.load_log();
			    			
			    		}
			    		self.render_menu();
			    	});


			    	return;


				
				}
			}
		}
	}

	find_node(id) {
		for(var node_index in this.nodes) {
			let node = this.nodes[node_index];
			if(node.name == id) {
				return node;
			}
		}
		return null;
	}
}

function setup_task_one() {
	model = new Model();
	pc = new Desktop('Bob\'s PC', 'AABBCC');
	router = new Router('Bob\'s router', 'DDEEFF', '1.2.3.4', '255.255.255.0');
	model.add_node(pc);
	model.add_node(router);
	model.render_nodes();
	model.hook_nodes();
	model.render_menu();
}