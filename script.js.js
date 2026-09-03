document.addEventListener('DOMContentLoaded', () => {
  const APPS_SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbx-05KX045K2FczkVfzYl5b9lckR3lRa17Fs1J1fznPTYhxpajnX7AELe0XVK3LihBW/exec';
  const CSV_URL = 'https://docs.google.com/spreadsheets/d/e/2PACX-1vQBLxWDVzJuGZCVxmeIsNknSTjuhsY4lBuGP4TOQUUsb08Bpx_VO4qt_d5iUtAucwzgju5cgIEIwZ0o/pub?gid=0&single=true&output=csv';

  const getUrlParam = (param) => {
    const urlParams = new URLSearchParams(window.location.search);
    return urlParams.get(param);
  };

  // ==========================================
  // 1. PRODUCT PAGE (product.html)
  // ==========================================
  const filterBar = document.getElementById('filter-bar');
  const productList = document.getElementById('product-list');

  if (productList) {
    let allProducts = [];

    const renderProducts = (products) => {
      productList.innerHTML = '';
      if (!products || products.length === 0) {
        productList.innerHTML = '<p class="no-products" style="grid-column: 1/-1; text-align: center; padding: 2rem;">ไม่พบสินค้าในหมวดหมู่นี้</p>';
        return;
      }

      products.forEach((product) => {
        const card = document.createElement('div');
        card.className = 'product-card';
        card.innerHTML = `
          <div class="product-img-wrapper">
            <img src="${product.image}" alt="${product.name}" onerror="this.onerror=null; this.src='https://via.placeholder.com/300x200?text=StudyMate';">
            <span class="category-tag">${product.category}</span>
          </div>
          <div class="product-content">
            <h3 class="product-title">${product.name}</h3>
            <p class="product-desc">${product.description || ''}</p>
            <div class="product-footer">
              <span class="product-price">฿${Number(product.price).toLocaleString()}</span>
              <a href="order.html?item=${encodeURIComponent(product.name)}&price=${encodeURIComponent(product.price)}" class="add-cart-btn">สั่งซื้อ</a>
            </div>
          </div>
        `;
        productList.appendChild(card);
      });
    };

    const filterProducts = (category) => {
      if (filterBar) {
        const buttons = filterBar.querySelectorAll('button, .cat-btn');
        buttons.forEach((btn) => {
          const btnCat = btn.getAttribute('data-category');
          if (btnCat === category || (!category && btnCat === 'all') || (category === 'all' && btnCat === 'all')) {
            btn.classList.add('active');
          } else {
            btn.classList.remove('active');
          }
        });
      }

      if (!category || category === 'all') {
        renderProducts(allProducts);
      } else {
        const filtered = allProducts.filter(
          (p) => p.category && p.category.toLowerCase() === category.toLowerCase()
        );
        renderProducts(filtered);
      }
    };

    fetch('products.json')
      .then((res) => {
        if (!res.ok) throw new Error('Network response was not ok');
        return res.json();
      })
      .then((data) => {
        allProducts = data;
        const categoryParam = getUrlParam('category');
        filterProducts(categoryParam || 'all');
      })
      .catch((err) => {
        console.error('Error loading products.json:', err);
        productList.innerHTML = '<p class="error" style="grid-column: 1/-1; text-align: center; color: red; padding: 2rem;">เกิดข้อผิดพลาดในการโหลดข้อมูลสินค้า</p>';
      });

    if (filterBar) {
      filterBar.addEventListener('click', (e) => {
        const btn = e.target.closest('button, .cat-btn');
        if (btn) {
          const cat = btn.getAttribute('data-category');
          if (cat) {
            filterProducts(cat);
            const newUrl = cat === 'all' 
              ? window.location.pathname 
              : `${window.location.pathname}?category=${encodeURIComponent(cat)}`;
            window.history.pushState({ path: newUrl }, '', newUrl);
          }
        }
      });
    }
  }

  // ==========================================
  // 2. ORDER PAGE (order.html)
  // ==========================================
  const orderForm = document.getElementById('orderForm');
  const itemsInput = document.getElementById('items');
  const totalInput = document.getElementById('total');

  if (orderForm) {
    const itemParam = getUrlParam('item');
    const priceParam = getUrlParam('price');

    if (itemsInput && itemParam) {
      itemsInput.value = itemParam;
    }
    if (totalInput && priceParam) {
      totalInput.value = priceParam;
    }

    orderForm.addEventListener('submit', async (e) => {
      e.preventDefault();

      const customerNameInput = document.getElementById('customerName');
      const contactInput = document.getElementById('contact');
      const noteInput = document.getElementById('note');

      const submitBtn = orderForm.querySelector('button[type="submit"]');
      const originalBtnText = submitBtn ? submitBtn.textContent : 'สั่งซื้อ';

      if (submitBtn) {
        submitBtn.disabled = true;
        submitBtn.textContent = 'กำลังส่งข้อมูล...';
      }

      const payload = {
        customerName: customerNameInput ? customerNameInput.value.trim() : '',
        contact: contactInput ? contactInput.value.trim() : '',
        items: itemsInput ? itemsInput.value.trim() : '',
        total: totalInput ? totalInput.value.trim() : '',
        note: noteInput ? noteInput.value.trim() : ''
      };

      try {
        await fetch(APPS_SCRIPT_URL, {
          method: 'POST',
          mode: 'no-cors',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify(payload)
        });

        window.location.href = 'thankyou.html';
      } catch (error) {
        console.error('Error submitting order:', error);
        alert('เกิดข้อผิดพลาดในการส่งข้อมูลการสั่งซื้อ กรุณาลองใหม่อีกครั้ง');
        if (submitBtn) {
          submitBtn.disabled = false;
          submitBtn.textContent = originalBtnText;
        }
      }
    });
  }

  // ==========================================
  // 3. ADMIN PAGE (admin.html)
  // ==========================================
  const ordersTableBody = document.querySelector('#ordersTable tbody');

  if (ordersTableBody) {
    const parseCSV = (csvText) => {
      const lines = [];
      let row = [];
      let currentToken = '';
      let insideQuotes = false;

      for (let i = 0; i < csvText.length; i++) {
        const char = csvText[i];
        const nextChar = csvText[i + 1];

        if (char === '"') {
          if (insideQuotes && nextChar === '"') {
            currentToken += '"';
            i++;
          } else {
            insideQuotes = !insideQuotes;
          }
        } else if (char === ',' && !insideQuotes) {
          row.push(currentToken.trim());
          currentToken = '';
        } else if ((char === '\n' || char === '\r') && !insideQuotes) {
          if (char === '\r' && nextChar === '\n') {
            i++;
          }
          row.push(currentToken.trim());
          if (row.some(cell => cell.length > 0)) {
            lines.push(row);
          }
          row = [];
          currentToken = '';
        } else {
          currentToken += char;
        }
      }

      if (currentToken || row.length > 0) {
        row.push(currentToken.trim());
        if (row.some(cell => cell.length > 0)) {
          lines.push(row);
        }
      }

      return lines;
    };

    fetch(CSV_URL)
      .then((res) => {
        if (!res.ok) throw new Error('Failed to fetch CSV');
        return res.text();
      })
      .then((csvData) => {
        const rows = parseCSV(csvData.trim());
        
        if (rows.length <= 1) {
          ordersTableBody.innerHTML = '<tr><td colspan="10" style="text-align:center; padding: 1.5rem;">ไม่พบข้อมูลรายการสั่งซื้อ</td></tr>';
          return;
        }

        const dataRows = rows.slice(1);
        dataRows.reverse();

        ordersTableBody.innerHTML = '';
        dataRows.forEach((row) => {
          const tr = document.createElement('tr');
          row.forEach((cellValue) => {
            const td = document.createElement('td');
            td.textContent = cellValue;
            tr.appendChild(td);
          });
          ordersTableBody.appendChild(tr);
        });
      })
      .catch((err) => {
        console.error('Error fetching CSV:', err);
        ordersTableBody.innerHTML = '<tr><td colspan="10" style="text-align:center; color: red; padding: 1.5rem;">เกิดข้อผิดพลาดในการโหลดข้อมูลตารางคำสั่งซื้อ</td></tr>';
      });
  }
});