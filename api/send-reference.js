// Vercel serverless function: emails a Request-for-Testing reference attachment.
//
// Called by the Request for Testing form (main system and Viewing Deck). The recipient is fixed
// here on the server, never taken from the request, so this endpoint can't be used to mail
// anyone else. Callers must send a Firebase ID token for an @1wan.ph account of THIS project.
//
// Setup (Vercel project -> Settings -> Environment Variables):
//   RESEND_API_KEY   required   API key from https://resend.com
//   MAIL_FROM        optional   e.g. "Inventory-Logistics System <noreply@1wan.ph>" (needs a verified
//                               domain in Resend). Default is Resend's shared sender, which can only
//                               deliver to the email address the Resend account was created with.
//   REFERENCE_MAIL_TO optional  defaults to mg@1wan.ph

// Public web API key from firebase-config.js — pins token checks to this Firebase project.
var FIREBASE_API_KEY = "AIzaSyDU6Gv2Rha8gupI2cXrIlIWKieSc311eH4";
var ALLOWED_DOMAIN = "@1wan.ph";
var MAX_BYTES = 3 * 1024 * 1024; // keeps the base64 JSON body under Vercel's 4.5 MB limit
var EXTENSIONS = ["pdf", "png", "jpg", "jpeg", "doc", "docx", "xls", "xlsx", "csv", "txt", "eml", "msg"];
var ORIGINS = [
  "https://inventory-rust-nine.vercel.app",
  "https://viewing-deck.vercel.app"
];

function esc(s){
  return String(s == null ? "" : s).replace(/[&<>"']/g, function(c){
    return {"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c];
  });
}

function fail(res, status, message){
  res.status(status).json({ error: message });
}

module.exports = async function handler(req, res){
  var origin = req.headers.origin;
  if(origin && ORIGINS.indexOf(origin) > -1){
    res.setHeader("Access-Control-Allow-Origin", origin);
    res.setHeader("Vary", "Origin");
  }
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");
  if(req.method === "OPTIONS") return res.status(204).end();
  if(req.method !== "POST") return fail(res, 405, "POST only.");

  if(!process.env.RESEND_API_KEY){
    return fail(res, 500, "Email isn't set up yet — add RESEND_API_KEY in the Vercel project's environment variables.");
  }

  // Who is calling? Ask Firebase to validate the ID token, then check the domain.
  var token = String(req.headers.authorization || "").replace(/^Bearer\s+/i, "");
  if(!token) return fail(res, 401, "Sign in again and retry.");
  var email = "";
  try{
    var lookup = await fetch("https://identitytoolkit.googleapis.com/v1/accounts:lookup?key=" + FIREBASE_API_KEY, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ idToken: token })
    });
    var info = await lookup.json();
    email = lookup.ok && info.users && info.users[0] && info.users[0].email ? String(info.users[0].email).toLowerCase() : "";
  }catch(e){ email = ""; }
  if(!email || email.slice(-ALLOWED_DOMAIN.length) !== ALLOWED_DOMAIN) return fail(res, 401, "Sign in again with your @1wan.ph account and retry.");

  var body = req.body;
  if(typeof body === "string"){ try{ body = JSON.parse(body); }catch(e){ body = null; } }
  if(!body || typeof body !== "object") return fail(res, 400, "Bad request.");

  var filename = String(body.filename || "").replace(/[\\/:*?"<>|\r\n]+/g, "_").slice(0, 120);
  var ext = filename.indexOf(".") > -1 ? filename.split(".").pop().toLowerCase() : "";
  if(!filename || EXTENSIONS.indexOf(ext) < 0) return fail(res, 400, "That file type isn't allowed. Use PDF, image, Word, Excel, CSV, text or email files.");
  var content = String(body.content || "");
  if(!content || content.length > Math.ceil(MAX_BYTES * 4 / 3) + 8) return fail(res, 413, "Attachment is too large — 3 MB max.");
  if(Buffer.from(content, "base64").length > MAX_BYTES) return fail(res, 413, "Attachment is too large — 3 MB max.");

  var items = Array.isArray(body.items) ? body.items.slice(0, 50) : [];
  var itemRows = items.map(function(it){
    return "<li>" + esc(String(it.item || "").slice(0, 200)) + " &times; " + esc(String(it.qty || "").slice(0, 10)) +
      (it.serials ? "<br><span style=\"color:#555\">Serial no.: " + esc(String(it.serials).slice(0, 500)) + "</span>" : "") + "</li>";
  }).join("");
  var customer = String(body.customer || "").slice(0, 200);
  var requestDate = String(body.requestDate || "").slice(0, 20);

  var html =
    "<p><b>New Request for Testing</b> — reference attached.</p>" +
    "<table cellpadding=\"4\" style=\"border-collapse:collapse\">" +
    "<tr><td><b>Request date</b></td><td>" + esc(requestDate) + "</td></tr>" +
    "<tr><td><b>Customer</b></td><td>" + esc(customer) + "</td></tr>" +
    "<tr><td><b>Requested by</b></td><td>" + esc(email) + "</td></tr>" +
    "<tr><td><b>Attachment</b></td><td>" + esc(filename) + "</td></tr></table>" +
    "<p><b>Item(s)</b></p><ul>" + itemRows + "</ul>" +
    "<p style=\"color:#777;font-size:12px\">Sent automatically by the Inventory-Logistics System.</p>";

  var sent;
  try{
    sent = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: "Bearer " + process.env.RESEND_API_KEY },
      body: JSON.stringify({
        from: process.env.MAIL_FROM || "Inventory-Logistics System <onboarding@resend.dev>",
        to: [process.env.REFERENCE_MAIL_TO || "mg@1wan.ph"],
        reply_to: email,
        subject: "Request for Testing — " + (customer || "no customer") + " (" + filename + ")",
        html: html,
        attachments: [{ filename: filename, content: content }]
      })
    });
  }catch(e){ return fail(res, 502, "Couldn't reach the email service — try again."); }

  if(!sent.ok){
    var detail = "";
    try{ var j = await sent.json(); detail = j && (j.message || j.error) ? String(j.message || j.error).slice(0, 200) : ""; }catch(e){}
    return fail(res, 502, "The email service refused the message" + (detail ? ": " + detail : ".") );
  }
  res.status(200).json({ ok: true });
};
