const cart = new Map();
const els = {};

const money = (value) =>
  value.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

function qtyOf(id) {
  return cart.get(id)?.qty || 0;
}

function cartCount() {
  return [...cart.values()].reduce((sum, item) => sum + item.qty, 0);
}

function subtotal() {
  return [...cart.values()].reduce((sum, item) => sum + item.price * item.qty, 0);
}

function deliveryFee() {
  const type = els.tipo?.value || "delivery";
  if (type === "retirada") return 0;
  return subtotal() >= RESTAURANT.freeDeliveryFrom ? 0 : RESTAURANT.deliveryFee;
}

function total() {
  return subtotal() + deliveryFee();
}

function setQty(id, qty) {
  const product = MENU.find((item) => item.id === id);
  if (!product) return;
  if (qty <= 0) cart.delete(id);
  else cart.set(id, { ...product, qty });
  render();
}

function add(id) {
  setQty(id, qtyOf(id) + 1);
}

function renderCategories() {
  els.cats.innerHTML = CATEGORIES.map(
    (cat, index) =>
      `<button class="cat-btn${index === 0 ? " active" : ""}" data-cat="${cat.id}">${cat.label}</button>`
  ).join("");
}

function renderMenu() {
  els.menu.innerHTML = CATEGORIES.map((cat) => {
    const items = MENU.filter((item) => item.category === cat.id);
    return `
      <section id="${cat.id}">
        <h2 class="section-title">${cat.label}</h2>
        <div class="grid">
          ${items.map(cardHtml).join("")}
        </div>
      </section>
    `;
  }).join("");
}

function cardHtml(item) {
  const qty = qtyOf(item.id);
  const action = qty
    ? `<div class="qty">
        <button data-minus="${item.id}" aria-label="Diminuir">−</button>
        <span>${qty}</span>
        <button data-plus="${item.id}" aria-label="Aumentar">+</button>
      </div>`
    : `<button class="add-btn" data-add="${item.id}">Adicionar</button>`;

  return `
    <article class="card">
      <div class="card-photo">
        <img src="${item.image}" alt="${item.name}" loading="lazy">
        ${item.badge ? `<span class="badge">${item.badge}</span>` : ""}
      </div>
      <div class="card-body">
        <h3>${item.name}</h3>
        <div class="pieces">${item.pieces}</div>
        <p>${item.desc}</p>
        <div class="card-foot">
          <div class="price">${money(item.price)}</div>
          ${action}
        </div>
      </div>
    </article>
  `;
}

function renderCart() {
  const items = [...cart.values()];
  els.cartCount.textContent = cartCount();
  els.cartCount.hidden = cartCount() === 0;
  els.bottomBar.classList.toggle("visible", cartCount() > 0);
  els.bottomCount.textContent = `${cartCount()} ${cartCount() === 1 ? "item" : "itens"}`;
  els.bottomTotal.textContent = money(subtotal());

  if (!items.length) {
    els.cartList.innerHTML = `<p class="empty">Seu carrinho ainda está vazio. Escolha um combinado e comece o pedido.</p>`;
  } else {
    els.cartList.innerHTML = items
      .map(
        (item) => `
        <div class="cart-item">
          <img src="${item.image}" alt="${item.name}">
          <div>
            <h4>${item.name}</h4>
            <small>${item.pieces} · ${money(item.price)}</small>
            <div class="qty" style="margin-top:8px">
              <button data-minus="${item.id}">−</button>
              <span>${item.qty}</span>
              <button data-plus="${item.id}">+</button>
            </div>
          </div>
          <strong>${money(item.price * item.qty)}</strong>
        </div>`
      )
      .join("");
  }

  els.subtotal.textContent = money(subtotal());
  els.entrega.textContent = deliveryFee() === 0 ? "Grátis" : money(deliveryFee());
  els.total.textContent = money(total());
  els.checkoutBtn.disabled = items.length === 0;
}

function render() {
  renderMenu();
  renderCart();
}

function openDrawer() {
  els.drawer.classList.add("open");
}

function closeDrawer() {
  els.drawer.classList.remove("open");
}

function openCheckout() {
  if (!cart.size) return;
  closeDrawer();
  els.checkout.classList.add("open");
  toggleAddress();
}

function closeCheckout() {
  els.checkout.classList.remove("open");
}

function toggleAddress() {
  const delivery = els.tipo.value === "delivery";
  els.addressWrap.style.display = delivery ? "grid" : "none";
  els.endereco.required = delivery;
  renderCart();
}

function buildMessage(data) {
  const items = [...cart.values()]
    .map((item) => `• ${item.qty}x ${item.name} (${item.pieces}) — ${money(item.price * item.qty)}`)
    .join("\n");

  const address =
    data.tipo === "delivery"
      ? `*Entrega:* ${data.endereco}`
      : `*Retirada:* ${RESTAURANT.address}`;

  const fee = deliveryFee() === 0 ? "Grátis" : money(deliveryFee());
  const now = new Date().toLocaleString("pt-BR");

  return [
    `*PEDIDO CONFIRMADO — ${RESTAURANT.name}*`,
    ``,
    `*Cliente:* ${data.nome}`,
    `*WhatsApp:* ${data.telefone}`,
    address,
    `*Tipo:* ${data.tipo === "delivery" ? "Delivery" : "Retirada"}`,
    `*Pagamento:* ${data.pagamento}`,
    ``,
    `*Itens do pedido:*`,
    items,
    ``,
    `*Subtotal:* ${money(subtotal())}`,
    `*Taxa de entrega:* ${fee}`,
    `*TOTAL:* ${money(total())}`,
    data.obs ? `\n*Observações:* ${data.obs}` : "",
    ``,
    now,
    `Obrigado! Seu pedido já está na fila da cozinha.`,
  ]
    .filter((line, index, arr) => !(line === "" && arr[index - 1] === ""))
    .join("\n");
}

function submitOrder(event) {
  event.preventDefault();
  const data = {
    nome: els.nome.value.trim(),
    telefone: els.telefone.value.trim(),
    tipo: els.tipo.value,
    endereco: els.endereco.value.trim(),
    pagamento: els.pagamento.value,
    obs: els.obs.value.trim(),
  };

  if (!data.nome || !data.telefone) return;
  if (data.tipo === "delivery" && !data.endereco) return;

  const text = encodeURIComponent(buildMessage(data));
  const url = `https://wa.me/${RESTAURANT.whatsapp}?text=${text}`;

  els.checkout.classList.remove("open");
  els.success.classList.add("open");
  window.open(url, "_blank");
}

function finishSuccess() {
  cart.clear();
  els.form.reset();
  els.success.classList.remove("open");
  els.checkout.classList.remove("open");
  render();
}

function bindEvents() {
  document.body.addEventListener("click", (event) => {
    const addId = event.target.closest("[data-add]")?.dataset.add;
    const plusId = event.target.closest("[data-plus]")?.dataset.plus;
    const minusId = event.target.closest("[data-minus]")?.dataset.minus;
    const cat = event.target.closest("[data-cat]");

    if (addId) add(addId);
    if (plusId) add(plusId);
    if (minusId) setQty(minusId, qtyOf(minusId) - 1);

    if (cat) {
      document.querySelectorAll(".cat-btn").forEach((btn) => btn.classList.remove("active"));
      cat.classList.add("active");
      document.getElementById(cat.dataset.cat)?.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  });

  els.openCart.addEventListener("click", openDrawer);
  els.bottomBar.addEventListener("click", openDrawer);
  els.closeCart.addEventListener("click", closeDrawer);
  els.cartBackdrop.addEventListener("click", closeDrawer);
  els.checkoutBtn.addEventListener("click", openCheckout);
  els.closeCheckout.addEventListener("click", closeCheckout);
  els.checkoutBackdrop.addEventListener("click", closeCheckout);
  els.tipo.addEventListener("change", toggleAddress);
  els.form.addEventListener("submit", submitOrder);
  els.closeSuccess.addEventListener("click", finishSuccess);
}

function boot() {
  els.cats = document.getElementById("cats");
  els.menu = document.getElementById("menu");
  els.cartCount = document.getElementById("cart-count");
  els.openCart = document.getElementById("open-cart");
  els.bottomBar = document.getElementById("bottom-bar");
  els.bottomCount = document.getElementById("bottom-count");
  els.bottomTotal = document.getElementById("bottom-total");
  els.drawer = document.getElementById("drawer");
  els.cartBackdrop = document.getElementById("cart-backdrop");
  els.closeCart = document.getElementById("close-cart");
  els.cartList = document.getElementById("cart-list");
  els.subtotal = document.getElementById("subtotal");
  els.entrega = document.getElementById("entrega");
  els.total = document.getElementById("total");
  els.checkoutBtn = document.getElementById("go-checkout");
  els.checkout = document.getElementById("checkout");
  els.checkoutBackdrop = document.getElementById("checkout-backdrop");
  els.closeCheckout = document.getElementById("close-checkout");
  els.form = document.getElementById("order-form");
  els.nome = document.getElementById("nome");
  els.telefone = document.getElementById("telefone");
  els.tipo = document.getElementById("tipo");
  els.endereco = document.getElementById("endereco");
  els.addressWrap = document.getElementById("address-wrap");
  els.pagamento = document.getElementById("pagamento");
  els.obs = document.getElementById("obs");
  els.success = document.getElementById("success");
  els.closeSuccess = document.getElementById("close-success");

  document.getElementById("rest-address").textContent = RESTAURANT.address;
  document.getElementById("rest-hours").textContent = RESTAURANT.hours;
  document.getElementById("rest-delivery").textContent = RESTAURANT.deliveryTime;
  document.getElementById("rest-rating").textContent = `${RESTAURANT.rating} · ${RESTAURANT.reviews}`;
  document.getElementById("fee-hint").textContent = `Grátis acima de ${money(RESTAURANT.freeDeliveryFrom)}`;

  renderCategories();
  render();
  bindEvents();
}

document.addEventListener("DOMContentLoaded", boot);
