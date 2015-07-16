frappe.socket = {
  open_tasks: {},
  init: function() {
    frappe.socket.socket = io.connect('http://' + document.domain + ':' + 3000);
    frappe.socket.socket.on('msgprint', function(message) {
      frappe.msgprint(message)
    });

    frappe.socket.setup_listeners();
    frappe.socket.setup_reconnect();
	$(document).on('form-load', function(e, frm) {
		frappe.socket.doc_subscribe(frm.doctype, frm.docname);
	});

	$(document).on('form-unload', function(e, frm) {
		frappe.socket.doc_unsubscribe(frm.doctype, frm.docname);
	});
  },
  subscribe: function(task_id, opts) {
    frappe.socket.socket.emit('task_subscribe', task_id);
    frappe.socket.socket.emit('progress_subscribe', task_id);

    frappe.socket.open_tasks[task_id] = opts;
  },
	doc_subscribe: function(doctype, docname) {
		frappe.socket.socket.emit('doc_subscribe', doctype, docname);
		frappe.socket.open_doc = {doctype: doctype, docname: docname};
  },
	doc_unsubscribe: function(doctype, docname) {
		frappe.socket.socket.emit('doc_unsubscribe', doctype, docname);
		frappe.socket.open_doc = null;
  },
  setup_listeners: function() {
    frappe.socket.socket.on('task_status_change', function(data) {
      if(data.status==="Running") {
        frappe.socket.process_response(data, "running");
      } else {
        // failed or finished
          frappe.socket.process_response(data, "callback");
        // delete frappe.socket.open_tasks[data.task_id];
      }
    });
    frappe.socket.socket.on('task_progress', function(data) {
      frappe.socket.process_response(data, "progress");
    });
    frappe.socket.socket.on('new_comment', function(comment) {
		if (cur_frm.doctype === comment.comment_doctype && cur_frm.docname === comment.comment_docname) {
			cur_frm.get_docinfo().comments = cur_frm.comments.get_comments().concat([comment]);
			cur_frm.comments.refresh();
		}
    });

  },
  setup_reconnect: function() {
    // subscribe again to open_tasks
    frappe.socket.socket.on("connect", function() {
      $.each(frappe.socket.open_tasks, function(task_id, opts) {
        frappe.socket.subscribe(task_id, opts);
      });
    });

	  if(frappe.socket.open_doc) {
		  frappe.socket.doc_subscribe(frappe.socket.open_doc.doctype, frappe.socket.open_doc.docname);
	  }
  },
  process_response: function(data, method) {
    if(!data) {
      return;
    }
    if(data) {
      var opts = frappe.socket.open_tasks[data.task_id];
      if(opts[method]) opts[method](data.message);
    }
    if(opts.always) {
      opts.always(data.message);
    }
    if(data.status_code && status_code > 400 && opts.error) {
      opts.error(data.message);
      return;
    }

  }
}

$(frappe.socket.init);

