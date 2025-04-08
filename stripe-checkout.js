videojs.registerPlugin('stripeCheckout', function (options) {
  const player = this;
  const stripePublicKey = options.publicKey;
  const stripe = Stripe(stripePublicKey);
  const hasPaid = localStorage.getItem('hasPaid')

  // Rent Button
  const rentButtonDiv = document.createElement('div');
  rentButtonDiv.textContent = 'Rent';
  rentButtonDiv.className = 'vjs-rent-button'; // Add a class for styling
  rentButtonDiv.innerHTML = `
                 <button type="button" class="btn" id="pay-button">Rent</button>
  `;

  player.el().appendChild(rentButtonDiv);

  // Modal
  const stripeModal = document.createElement('div');
  stripeModal.className = 'vjs-payment-modal'; // Add a class for styling
  stripeModal.innerHTML = `
       <div class="vjs-modal-body">
           <div id="checkout" class="checkout">
               </div>
       </div>
   `;
  player.el().appendChild(stripeModal);

  // player.controlBar.el().appendChild(modal); //appends element to the contral bar

   // Success Modal
   const successModal = document.createElement('div');
   successModal.className = 'vjs-success-modal';
   successModal.innerHTML = `
           <p style="color:white;">Payment successful, thank you. An email has been sent to <span id="customer-email"></span>. You may begin watching. Note, that if you clear your browser cache, you'll be prompted to pay again (its a PoC, ok)</p>
           <button id="close-success-modal" class="vjs-close-button">Start Watching</button>
   `;
   player.el().appendChild(successModal);


  player.on('play', () => {
    if (hasPaid === 'true' || player.paid) return; //if paid continue / allow playback
    player.pause();
    rentButtonDiv.style.display = 'block'; //show the rent button if not paid
    if (player.paid) return;
  });

  const rentButton = document.getElementById('pay-button');
  rentButton.addEventListener('click', async () => {
    let currentSessionId;

    const fetchClientSecret = async () => {
      const response = await fetch("/create-checkout-session", {
        method: "POST",
      });
      const { clientSecret, sessionId } = await response.json();
      currentSessionId = sessionId 
      return {clientSecret, sessionId };
    };

    const handleComplete = async function() {     
      checkout.unmount('#checkout');
      console.log("inside complete")
      console.log(currentSessionId)
      const response = await fetch(`/session-status?session_id=${currentSessionId}`);
      const session = await response.json();
      document.getElementById('customer-email').textContent = session.customer_email
      successModal.style.display = 'block';
      player.paid = true;
      //localStorage.setItem('hasPaid', true);
      //player.play();

      // Retrieve details from server (which loads Checkout Session)
      const details = await retrievePurchaseDetails();
      console.log(details)
      // Show custom purchase summary
      //showPurchaseSummary(details);
      //console.log(details)
    }

    const checkoutData = await fetchClientSecret(); 
    const checkout = await stripe.initEmbeddedCheckout({
      fetchClientSecret : async () => checkoutData.clientSecret,
      onComplete: handleComplete
    });
  
    // Mount Checkout
    rentButtonDiv.style.display = 'none';
    stripeModal.style.display = 'block';
    checkout.mount('#checkout');
  });
 
  document.getElementById('close-success-modal').addEventListener('click', () => {
    successModal.style.display = 'none';
    player.play();
  });


 //plugin end
});
