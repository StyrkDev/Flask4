document.addEventListener('DOMContentLoaded', () => {
    const table = document.getElementById('chamados-table');
    const headers = table.querySelectorAll('th');
    const idFilter = document.getElementById('id-filter');
    const resultCounter = document.getElementById('result-counter');
    const statusCheckboxes = document.querySelectorAll('.status-checkbox');
    let sortDirection = 'desc'; // Direção de ordenação decrescente
    let sortedIndex = 0; // Índice da coluna ID

    // Função para ordenar a tabela
    const sortTable = (index, direction) => {
        const rows = Array.from(table.querySelectorAll('tbody tr'));
        rows.sort((rowA, rowB) => {
            const cellA = rowA.cells[index].textContent.trim();
            const cellB = rowB.cells[index].textContent.trim();
            if (direction === 'asc') {
                return cellA.localeCompare(cellB, 'en', { numeric: true });
            } else {
                return cellB.localeCompare(cellA, 'en', { numeric: true });
            }
        });
        rows.forEach(row => table.querySelector('tbody').appendChild(row));
        updateCounter(); // Atualiza o contador após a ordenação
        updateRowColors();
    };

    // Função para atualizar o contador de resultados
    const updateCounter = () => {
        const visibleRows = Array.from(table.querySelectorAll('tbody tr')).filter(row => row.style.display !== 'none');
        resultCounter.textContent = visibleRows.length;
    };
   
    const applyFilters = () => {
        const idValue = idFilter.value.trim().toLowerCase();
        const selectedStatuses = Array.from(statusCheckboxes)
            .filter(checkbox => checkbox.checked)
            .map(checkbox => checkbox.value.toLowerCase());

        const headerFilters = Array.from(headers).map(header => {
            const input = header.querySelector('input');
            return input ? input.value.trim().toLowerCase() : '';
        });

        const rows = table.querySelectorAll('tbody tr');
        rows.forEach(row => {
            const idCell = row.cells[0].textContent.trim().toLowerCase();
            const statusCell = row.cells[1].textContent.trim().toLowerCase();

            const matchesId = idValue ? idCell === idValue : true; // Exato se não estiver vazio
            const matchesStatus = selectedStatuses.length === 0 || selectedStatuses.includes(statusCell);
            const matchesHeaderFilters = Array.from(row.cells).every((cell, index) => {
                const filterValue = headerFilters[index];
                return !filterValue || cell.textContent.toLowerCase().includes(filterValue);
            });

            if (idValue) {
                row.style.display = matchesId ? '' : 'none';
            } else {
                row.style.display = matchesStatus && matchesHeaderFilters ? '' : 'none';
            }
        });
        updateCounter();
        updateRowColors();
    };    

    const updateRowColors = () => {
        const visibleRows = Array.from(table.querySelectorAll('tbody tr')).filter(row => row.style.display !== 'none');
        visibleRows.forEach((row, index) => {
            row.classList.toggle('even-row', index % 2 === 0);
            row.classList.toggle('odd-row', index % 2 !== 0);
        });
    };
/*
    headers.forEach((header, index) => {
        const existingInput = header.querySelector('input');
        if (!existingInput) {
            const filterInput = document.createElement('input');
            filterInput.type = 'text';
            filterInput.placeholder = `Filtrar ${header.textContent}`;

            if (header.textContent === 'ID') {
                filterInput.classList.add('id-filter');
            } else if (header.textContent === 'Descrição') {
                filterInput.classList.add('desc-filter');
            } else {
                filterInput.classList.add('header-filter');
            }

            header.appendChild(filterInput);

            filterInput.addEventListener('click', (e) => {
                e.stopPropagation();
            });

            filterInput.addEventListener('input', (e) => {
                filterTable(index, e.target.value);
            });
        }
    });*/

    idFilter.addEventListener('input', applyFilters);

    statusCheckboxes.forEach(checkbox => {
        checkbox.addEventListener('change', applyFilters);
    }); 
/*
    headers.forEach((header, index) => {
        const existingInput = header.querySelector('input');
        if (!existingInput) {
            const filterInput = document.createElement('input');
            filterInput.type = 'text';
            filterInput.placeholder = `Filtrar ${header.textContent}`;

            header.appendChild(filterInput);

            filterInput.addEventListener('click', (e) => {
                e.stopPropagation();
            });

            filterInput.addEventListener('input', applyFilters);
        }
    });*/

    // Marcar "Aberta", "Em Atendimento" e "Em Pausa" como padrão
    statusCheckboxes.forEach(checkbox => {
        if (['Aberta', 'Em Atendimento', 'Em Pausa'].includes(checkbox.value)) {
            checkbox.checked = true;
        }
    }); 

    // Inicializa a tabela com os filtros aplicados
    applyFilters();
    updateRowColors();
    updateCounter();

    // Se houver necessidade de ordenar a tabela ao carregar
    if (sortedIndex !== null) {
        sortTable(sortedIndex, sortDirection);
    }

    // Classifica a coluna ID automaticamente em ordem decrescente ao carregar a página
    sortTable(sortedIndex, sortDirection);
    headers[sortedIndex].classList.add('sort-desc'); // Marca visualmente a coluna classificada

    // Adicionar evento de click para ordenar os headers
    headers.forEach((header, index) => {
        header.addEventListener('click', (e) => {
            if (e.target.tagName === 'INPUT') return;

            if (sortedIndex === index) {
                if (sortDirection === 'asc') {
                    sortDirection = 'desc';
                    header.classList.remove('sort-asc');
                    header.classList.add('sort-desc');
                } else if (sortDirection === 'desc') {
                    sortDirection = null;
                    header.classList.remove('sort-desc');
                    header.classList.remove('sort-asc');
                    resetTable();
                    return;
                }
            } else {
                sortDirection = 'asc';
                sortedIndex = index;
                headers.forEach(h => {
                    if (h !== header) {
                        h.classList.remove('sort-asc', 'sort-desc');
                    }
                });
                header.classList.add('sort-asc');
            }
            if (sortDirection) {
                sortTable(index, sortDirection);
            }
        });
    });

    // Função para resetar a tabela
    const resetTable = () => {
        const rows = Array.from(table.querySelectorAll('tbody tr'));
        rows.sort((rowA, rowB) => {
            const idA = parseInt(rowA.cells[0].textContent.trim(), 10);
            const idB = parseInt(rowB.cells[0].textContent.trim(), 10);
            return idA - idB;
        });
        rows.forEach(row => table.querySelector('tbody').appendChild(row));
        updateCounter(); // Atualiza o contador após resetar a tabela
    };

    // Função para filtrar por ID
    const filterById = (value) => {
        const rows = table.querySelectorAll('tbody tr');
        rows.forEach(row => {
            const cell = row.cells[0];
            row.style.display = value === "" ? '' : (cell.textContent.trim() === value ? '' : 'none');
        });
        updateCounter(); // Atualiza o contador após o filtro
        updateRowColors();
        applyFilters();
    };

    idFilter.addEventListener('input', (e) => {
        filterById(e.target.value.trim());
    });

       // Marcar "Aberta", "Em Atendimento" e "Em Pausa" como padrão
    statusCheckboxes.forEach(checkbox => {
        if (['Aberta', 'Em Atendimento', 'Em Pausa'].includes(checkbox.value)) {
            checkbox.checked = true;
        }
    });

    statusCheckboxes.forEach(checkbox => {
        checkbox.addEventListener('change', () => {
            filterByStatus();
        });
    });

    const filterByStatus = () => {
        const selectedStatuses = Array.from(statusCheckboxes)
            .filter(checkbox => checkbox.checked)
            .map(checkbox => checkbox.value.toLowerCase());

        const rows = document.querySelectorAll('#chamados-table tbody tr');

        rows.forEach(row => {
            const statusCell = row.querySelector('td:nth-child(2)').textContent.toLowerCase();
            
            // Verifica se o status da linha está nos status selecionados ou se nenhum checkbox está selecionado
            if (selectedStatuses.length === 0 || selectedStatuses.includes(statusCell)) {
                row.style.display = ''; // Mostra a linha
            } else {
                row.style.display = 'none'; // Esconde a linha
            }
        });
        updateCounter(); // Atualiza o contador após o filtro por status
        updateRowColors();
        applyFilters();
    };

    // Filtra a tabela inicialmente com os checkboxes marcados
    filterByStatus();

    // Função para filtrar a tabela com base no valor da célula, permitindo múltiplos valores
    const filterTable = (index, value) => {
        const rows = table.querySelectorAll('tbody tr');
    
        // Dividir os valores de filtro com base em vírgula, ponto e vírgula ou barra
        const filterValues = value.split(/[,;/]+/).map(val => val.trim().toLowerCase());
    
        rows.forEach(row => {
            const cell = row.cells[index];
            const cellText = cell.textContent.toLowerCase().trim();

            // Verifica se qualquer valor do filtro está presente na célula
            const match = filterValues.some(filterValue => cellText.includes(filterValue));
        
            // Mostra ou esconde a linha com base no resultado da filtragem
            row.style.display = match ? '' : 'none';
        });
        updateCounter(); // Atualiza o contador após o filtro
        updateRowColors();
        applyFilters();
    };

    headers.forEach((header, index) => {
        const filterInput = document.createElement('input');
        filterInput.type = 'text';
        filterInput.placeholder = `Filtrar ${header.textContent}`;

        if (header.textContent === 'ID') {
            filterInput.classList.add('id-filter');
        } else if (header.textContent === 'Descrição') {
            filterInput.classList.add('desc-filter');
        } else {
            filterInput.classList.add('header-filter');
        }

        header.appendChild(filterInput);

        filterInput.addEventListener('click', (e) => {
            e.stopPropagation();
        });

        filterInput.addEventListener('input', (e) => {
            filterTable(index, e.target.value);
        });
    });

    if (sortedIndex !== null) {
        sortTable(sortedIndex, sortDirection);
    }

    updateCounter(); // Atualiza o contador inicialmente
    updateRowColors();
    applyFilters();    
});

document.addEventListener('DOMContentLoaded', function() {
    const form = document.getElementById('logoutForm');
    form.addEventListener('submit', function(event) {
        // Mensagem no console sem o prefixo
        //logMessage('A função confirmarLogout foi chamada!');

        // Confirmar se o usuário deseja sair
        const confirmLogout = confirm("Você tem certeza que deseja sair?");
        if (!confirmLogout) {
            event.preventDefault(); // Cancela o envio do formulário se o usuário não confirmar
        }
    });
});

document.addEventListener('DOMContentLoaded', function() {
    const rows = document.querySelectorAll('table tr');

    rows.forEach(row => {
        row.addEventListener('click', function(event) {

            // Verifica se o elemento clicado é um cabeçalho
            if (event.target.tagName === 'TH') return;

            if (this.classList.contains('selected')) {
                this.classList.remove('selected');
                rows.forEach(r => r.classList.remove('deselected'));
            } else {
                rows.forEach(r => {
                    r.classList.remove('selected');
                    r.classList.add('deselected');
                });
                this.classList.add('selected');
                this.classList.remove('deselected');
            }
        });
    });

});


let idleTime = 0;
setInterval(() => {
    idleTime++;
    if (idleTime >= 10) { // 10 minutos de inatividade
        alert("Você foi desconectado por inatividade.");
        
        // Recuperar o token CSRF do meta tag
        const csrfToken = document.querySelector('meta[name="csrf-token"]').getAttribute('content');
        
        // Fazer uma solicitação POST para a rota de logout com o token CSRF
        fetch('/logout', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded',
                'X-CSRFToken': csrfToken  // Incluir o token CSRF no cabeçalho
            },
            credentials: 'same-origin' // Garantir que os cookies sejam enviados
        })
        .then(response => {
            if (response.redirected) {
                // Redireciona para a página de login após logout
                window.location.href = response.url;
            } else if (response.ok) {
                window.location.href = '/login';
            } else {
                console.error("Erro ao redirecionar após logout:", response.statusText);
            }
        })
        .catch(error => {
            console.error("Erro ao fazer logout:", error);
        });
    }
}, 60000); // Incrementa a cada minuto

// Reiniciar o tempo de inatividade ao detectar movimento ou tecla pressionada
document.onmousemove = document.onkeydown = () => idleTime = 0;
