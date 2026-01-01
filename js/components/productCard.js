class ProductCard {
    static render(product) {
        const card = document.createElement('div');
        card.className = 'product-card';
        card.onclick = () => window.app.viewProduct(product);
        
        const imageCount = product.images ? product.images.length : 1;
        
        card.innerHTML = `
            <div class="card-image">
                <img src="${product.thumbnail}" 
                     alt="${product.code}"
                     loading="lazy"
                     onerror="this.src='assets/placeholder.svg'">
                ${imageCount > 1 ? `<span class="image-count">${imageCount}</span>` : ''}
            </div>
            <div class="card-code">${product.code}</div>
        `;
        
        return card;
    }
}
