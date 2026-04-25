/**
 * Normalizes product docs (lean or plain) for inventory APIs: `clientId` → `client` shape.
 */
function formatProductWithClient(doc) {
  if (!doc || typeof doc !== "object") return doc;
  const plain = { ...doc };
  const cid = plain.clientId;
  if (cid && typeof cid === "object" && cid._id) {
    plain.client = {
      _id: cid._id,
      companyName: cid.companyName,
      shopName: cid.shopName,
      email: cid.email,
    };
  } else {
    plain.client = null;
  }
  delete plain.clientId;
  return plain;
}

function formatProductsWithClient(docs) {
  if (!Array.isArray(docs)) return [];
  return docs.map((d) => formatProductWithClient(d));
}

module.exports = { formatProductWithClient, formatProductsWithClient };
