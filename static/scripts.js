//console.log("O arquivo scripts.js foi carregado corretamente!");

document.addEventListener('DOMContentLoaded', () => {
    const table = document.getElementById('chamados-table');
    const headers = table.querySelectorAll('th');
    const idFilter = document.getElementById('id-filter');
    let sortDirection = 'desc'; // Direção de ordenação decrescente
    let sortedIndex = 0; // Índice da coluna ID

    const resultCounter = document.getElementById('result-counter');

    // Função para atualizar o contador de resultados
    const updateCounter = () => {
        const visibleRows = Array.from(table.querySelectorAll('tbody tr')).filter(row => row.style.display !== 'none');
        resultCounter.textContent = visibleRows.length;
    };

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
    };
  
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
    };

    idFilter.addEventListener('input', (e) => {
        filterById(e.target.value.trim());
    });

    // Filtrar por status usando checkboxes
    const statusCheckboxes = document.querySelectorAll('.status-checkbox');

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
    };

    // Filtra a tabela inicialmente com os checkboxes marcados
    filterByStatus();

    // Função para filtrar a tabela com base no valor da célula
    const filterTable = (index, value) => {
        const rows = table.querySelectorAll('tbody tr');
        rows.forEach(row => {
            const cell = row.cells[index];
            row.style.display = cell.textContent.toLowerCase().includes(value.toLowerCase()) ? '' : 'none';
        });
        updateCounter(); // Atualiza o contador após o filtro
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

let idleTime = 0;
setInterval(() => {
    idleTime++;
    if (idleTime >= 5) {
        alert("Você foi desconectado por inatividade.");
        window.location.href = "{{ url_for('logout') }}";
    }
}, 60000); // Incrementa a cada minuto

document.onmousemove = document.onkeydown  = () => idleTime = 0;
