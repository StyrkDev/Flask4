// Define a função updateCounter no escopo global
const updateCounter = () => {
    const table = document.getElementById('chamados-table');
    const visibleRows = Array.from(table.querySelectorAll('tbody tr')).filter(row => row.style.display !== 'none');
    const resultCounter = document.getElementById('result-counter');
    if (resultCounter) {
        resultCounter.textContent = visibleRows.length;
    }
};

// Certifique-se de que a função updateRowColors também está acessível
const updateRowColors = () => {
    const table = document.getElementById('chamados-table');
    const visibleRows = Array.from(table.querySelectorAll('tbody tr')).filter(row => row.style.display !== 'none');
    visibleRows.forEach((row, index) => {
        row.classList.remove('even-row', 'odd-row'); // Remove classes antigas
        row.classList.add(index % 2 === 0 ? 'even-row' : 'odd-row'); // Adiciona a classe correta
    });
};

const table = document.getElementById('chamados-table');
const headers = table.querySelectorAll('th');
const idFilter = document.getElementById('id-filter');
const statusCheckboxes = document.querySelectorAll('.status-checkbox');

const applyFilters = () => {
    const idValue = idFilter.value.trim().toLowerCase();
    const selectedStatuses = Array.from(statusCheckboxes)
        .filter(checkbox => checkbox.checked)
        .map(checkbox => checkbox.value.toLowerCase());

    const headerFilters = Array.from(headers).map(header => {
        const input = header.querySelector('input');
        return input ? input.value.trim().toLowerCase() : '';
    });

    // Obter os valores do filtro de data
    const startDateInput = document.getElementById('start-date');
    const endDateInput = document.getElementById('end-date');
    const startDate = startDateInput.value ? new Date(startDateInput.value) : null;
    const endDate = endDateInput.value ? new Date(endDateInput.value) : null;

    const rows = table.querySelectorAll('tbody tr');
    rows.forEach(row => {
        const idCell = row.cells[0].textContent.trim().toLowerCase();
        const statusCell = row.cells[1].textContent.trim().toLowerCase();
        const dateText = row.cells[2].textContent.trim(); // Coluna de data_abertura
        const [day, month, year] = dateText.split('/'); // Supondo formato DD/MM/YYYY
        const rowDate = new Date(`${year}-${month}-${day}`); // Converter para formato YYYY-MM-DD

        const matchesId = idValue ? idCell.includes(idValue) : true; // Verifica se o ID contém o valor
        const matchesStatus = selectedStatuses.length === 0 || selectedStatuses.includes(statusCell);

        // Ajuste para múltiplos valores no filtro do cabeçalho
        const matchesHeaderFilters = Array.from(row.cells).every((cell, index) => {
            const filterValue = headerFilters[index];
            if (!filterValue) return true;

            // Dividir o filtro em múltiplos valores (separados por vírgula, ponto e vírgula ou barra)
            const filterValues = filterValue.split(/[,;/]+/).map(value => value.trim().toLowerCase());

            // Verifica se o filtro é de exclusão (começa com "!")
            const isExclusion = filterValues.some(filterValue => filterValue.startsWith('!'));

            // Remove o "!" dos valores de exclusão
            const normalizedFilterValues = filterValues.map(filterValue =>
                filterValue.startsWith('!') ? filterValue.slice(1) : filterValue
            );

            // Verifica se há correspondência
            const match = normalizedFilterValues.some(filterValue => cell.textContent.toLowerCase().includes(filterValue));

            // Aplica a lógica de inclusão ou exclusão
            return isExclusion ? !match : match;
        });

        // Verifica se a linha corresponde ao filtro de data
        const matchesDate = (!startDate || rowDate >= startDate) &&
                            (!endDate || rowDate <= endDate);

        // Aplica todos os filtros
        if (matchesId && matchesStatus && matchesHeaderFilters && matchesDate) {
            row.style.display = '';
        } else {
            row.style.display = 'none';
        }
    });

    // Atualiza o contador e as cores das linhas visíveis
    updateCounter();
    updateRowColors();
};

document.addEventListener('DOMContentLoaded', () => {
    const table = document.getElementById('chamados-table');
    if (!table) {
        console.warn("Elemento 'chamados-table' não encontrado.");
        return; // Sai da função se o elemento não existir
    }

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

    idFilter.addEventListener('input', applyFilters);

    statusCheckboxes.forEach(checkbox => {
        checkbox.addEventListener('change', applyFilters);
    }); 

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

            // Verifica se o filtro é de exclusão (começa com "!")
            const isExclusion = filterValues.some(filterValue => filterValue.startsWith('!'));

            // Remove o "!" dos valores de exclusão
            const normalizedFilterValues = filterValues.map(filterValue =>
                filterValue.startsWith('!') ? filterValue.slice(1) : filterValue
            );

            // Verifica se há correspondência
            const match = normalizedFilterValues.some(filterValue => cellText.includes(filterValue));

            // Aplica a lógica de inclusão ou exclusão
            if (isExclusion) {
                row.style.display = match ? 'none' : ''; // Oculta as linhas que correspondem
            } else {
                row.style.display = match ? '' : 'none'; // Mostra apenas as linhas que correspondem
            }
        });

        updateCounter(); // Atualiza o contador após o filtro
        updateRowColors();
        applyFilters(); 
    };

    headers.forEach((header, index) => {
        const filterInput = document.createElement('input');
        filterInput.type = 'text';
        filterInput.placeholder = `Filtrar`;
        //filterInput.placeholder = `Filtrar ${header.textContent}`;

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

// Função para calcular e exibir resumos
document.addEventListener('DOMContentLoaded', () => {
    // Add event listener to the "Resumo" button to open the modal
    document.getElementById('resumo-button').addEventListener('click', () => {
        calcularResumos();
    });

    const closeResumoButton = document.getElementById('close-resumo');
    if (closeResumoButton) {
        closeResumoButton.addEventListener('click', () => {
            document.getElementById('resumo-modal').style.display = 'none';
        });
    } else {
        console.warn("Elemento 'close-resumo' não encontrado.");
    }

    // Add event listener to the "Filter" button to apply filters
    const filterButton = document.getElementById('filter-button');
    if (filterButton) {
        filterButton.addEventListener('click', () => {
            calcularResumos(true);
        });
    } else {
        console.warn("Elemento 'filter-button' não encontrado.");
    }
});

function calcularResumos(filtrarPorData = false) {
    const table = document.getElementById('chamados-table');
    const resumoPorSetor = {};
    const resumoPorFilial = {};
    const resumoPorStatus = {};
    const resumoPorAssunto = {};
    const isDesenvolvimento = document.body.getAttribute('data-is-desenvolvimento') === 'true';

    // Get start and end dates
    const startDateValue = document.getElementById('start-date').value;
    const endDateValue = document.getElementById('end-date').value;
    const startDate = new Date(startDateValue);
    const endDate = new Date(endDateValue);

    // Get selected statuses only for the summary
    const resumoStatusCheckboxes = document.querySelectorAll('.summary-status-checkbox');
    const selectedResumoStatuses = Array.from(resumoStatusCheckboxes)
        .filter(checkbox => checkbox.checked)
        .map(checkbox => checkbox.value.toLowerCase());

    // Calculate summaries
    const rows = table.querySelectorAll('tbody tr');
    rows.forEach(row => {
        const dateText = row.cells[2].textContent.trim(); // Assuming column 3 is the opening date
        const [day, month, year] = dateText.split('/');
        const date = new Date(`${year}-${month}-${day}`);
        const status = row.cells[1].textContent.trim().toLowerCase();

        console.log({ dateText, rowDate: date, startDate, endDate });

        // Filter by date and status for the summary
        const matchesDate = !filtrarPorData || 
            ((isNaN(startDate) || date >= startDate) && (isNaN(endDate) || date <= endDate));
        const matchesResumoStatus = selectedResumoStatuses.length === 0 || selectedResumoStatuses.includes(status);

        // Ensure filtering by either date or status
        if (matchesDate && matchesResumoStatus) {
            const setor = row.cells[5].textContent.trim();
            const filial = row.cells[4].textContent.trim();
            const tipo = row.cells[8].textContent.trim();

            if (status) {
                resumoPorStatus[status] = (resumoPorStatus[status] || 0) + 1;
            }
            if (setor) {
                resumoPorSetor[setor] = (resumoPorSetor[setor] || 0) + 1;
            }
            if (filial) {
                resumoPorFilial[filial] = (resumoPorFilial[filial] || 0) + 1;
            }    
            if (tipo) {
                resumoPorAssunto[tipo] = (resumoPorAssunto[tipo] || 0) + 1;    
            }
        }
    });

    // Sort and create summary content
    const sortedStatus = Object.entries(resumoPorStatus).sort((a, b) => b[1] - a[1]);
    const sortedSetor = Object.entries(resumoPorSetor).sort((a, b) => b[1] - a[1]);
    const sortedFilial = Object.entries(resumoPorFilial).sort((a, b) => b[1] - a[1]);
    const sortedAssunto = Object.entries(resumoPorAssunto).sort((a, b) => b[1] - a[1]);

    let resumoContent = "";

     // Exibir "Resumo por Status" apenas se não for a rota de desenvolvimento
     if (!isDesenvolvimento) {
       resumoContent += "<div class='resumo-column'><h3>Resumo por Status</h3><ul>";
       sortedStatus.forEach(([status, count]) => {
           resumoContent += `<li>${status}: ${count}</li>`;
      });
       resumoContent += "</ul></div>";
    }
    resumoContent += "</ul></div><div class='resumo-column'><h3>Resumo por Setor</h3><ul>";
    sortedSetor.forEach(([setor, count]) => {
        resumoContent += `<li>${setor}: ${count}</li>`;
    });
    resumoContent += "</ul></div><div class='resumo-column'><h3>Resumo por Código Filial</h3><ul>";
    sortedFilial.forEach(([filial, count]) => {
        resumoContent += `<li>${filial}: ${count}</li>`;
    });
    resumoContent += "</ul></div><div class='resumo-column'><h3>Resumo por Assunto</h3><ul>";
    sortedAssunto.forEach(([tipo, count]) => {
        resumoContent += `<li>${tipo}: ${count}</li>`;
    });
    resumoContent += "</ul></div>";

    // Display the summary in the dialog box
    document.getElementById('resumo-content').innerHTML = resumoContent;
    document.getElementById('resumo-modal').style.display = 'block';
}

document.addEventListener('DOMContentLoaded', () => {
    const themeToggle = document.getElementById('theme-toggle');
    if (!themeToggle) {
        console.warn("Elemento 'theme-toggle' não encontrado.");
        return; // Sai da função se o elemento não existir
    }

    const body = document.body;

    // Alternar o tema ao clicar no botão
    themeToggle.addEventListener('click', () => {
        if (body.classList.contains('light-mode')) {
            body.classList.remove('light-mode');
            localStorage.removeItem('theme'); // Remove a configuração salva
            themeToggle.textContent = '🌙'; // Ícone para ativar o modo claro
        } else {
            body.classList.add('light-mode');
            localStorage.setItem('theme', 'light-mode'); // Salva a configuração
            themeToggle.textContent = '☀️'; // Ícone para desativar o modo claro
        }
    });

    // Aplicar o tema salvo no localStorage (se existir)
    if (localStorage.getItem('theme') === 'light-mode') {
        body.classList.add('light-mode');
        themeToggle.textContent = '☀️'; // Ícone para desativar o modo claro
    }
});

const applyDateFilterButton = document.getElementById('apply-date-filter');

applyDateFilterButton.addEventListener('click', () => {
    const startDateInput = document.getElementById('start-date');
    const endDateInput = document.getElementById('end-date');

    // Obtenha os valores das datas
    const startDate = startDateInput.value ? new Date(startDateInput.value) : null;
    const endDate = endDateInput.value ? new Date(endDateInput.value) : null;

    const rows = document.querySelectorAll('#chamados-table tbody tr');
    rows.forEach(row => {
        const dateText = row.cells[2].textContent.trim(); // Coluna de data_abertura
        const [day, month, year] = dateText.split('/'); // Supondo formato DD/MM/YYYY
        const rowDate = new Date(`${year}-${month}-${day}`); // Converter para formato YYYY-MM-DD

        // Verifica se a linha corresponde ao filtro de data
        const matchesDate = (!startDate || rowDate >= startDate) &&
                            (!endDate || rowDate <= endDate);

        // Aplica o filtro de data
        row.style.display = matchesDate ? '' : 'none';
    });

    // Atualiza o contador e as cores das linhas visíveis
    updateCounter();
    updateRowColors();
    applyFilters();    
});

document.getElementById('export-excel').addEventListener('click', () => {
    const table = document.getElementById('chamados-table');
    const rows = Array.from(table.querySelectorAll('tr')).filter(row => row.style.display !== 'none')
        .map(row => Array.from(row.cells).map(cell => cell.textContent.trim()));

    const worksheet = XLSX.utils.aoa_to_sheet(rows);

    // Adicionar estilo de tabela
    const range = XLSX.utils.decode_range(worksheet['!ref']);
    for (let C = range.s.c; C <= range.e.c; ++C) {
        const cell = worksheet[XLSX.utils.encode_cell({ r: 0, c: C })];
        if (cell) cell.s = { font: { bold: true }, fill: { fgColor: { rgb: "D9E1F2" } } }; // Cabeçalhos
    }

    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Chamados');

    // Aplicar estilo de tabela
    worksheet['!cols'] = rows[0].map(() => ({ wpx: 120 })); // Largura das colunas
    worksheet['!rows'] = rows.map(() => ({ hpx: 20 })); // Altura das linhas

    // Obter a data atual no formato YYYY-MM-DD
    const currentDate = new Date().toISOString().split('T')[0];

    // Exportar o arquivo com a data no nome
    XLSX.writeFile(workbook, `chamados_${currentDate}.xlsx`);
});

document.addEventListener('DOMContentLoaded', () => {
    const backToTopButton = document.querySelector('.back-to-top');

    // Esconde o botão inicialmente
    backToTopButton.style.display = 'none';

    // Mostra ou esconde o botão ao rolar a página
    window.addEventListener('scroll', () => {
        if (window.scrollY > 200) { // Exibe o botão ao rolar mais de 200px
            backToTopButton.style.display = 'block';
        } else {
            backToTopButton.style.display = 'none';
        }
    });
});

const resumoFilterButton = document.getElementById('resumo-filter-button');

resumoFilterButton.addEventListener('click', () => {
    const resumoStartDateInput = document.getElementById('resumo-start-date');
    const resumoEndDateInput = document.getElementById('resumo-end-date');

    // Obtenha os valores das datas
    const resumoStartDate = resumoStartDateInput.value ? new Date(resumoStartDateInput.value) : null;
    const resumoEndDate = resumoEndDateInput.value ? new Date(resumoEndDateInput.value) : null;

    console.log({ resumoStartDate, resumoEndDate }); // Log para depuração
    // Adicione a lógica de filtro para o modal, se necessário
});

// Função para aplicar filtros no resumo
const applyResumoFilters = () => {
    const resumoStartDateInput = document.getElementById('resumo-start-date');
    const resumoEndDateInput = document.getElementById('resumo-end-date');
    const resumoStartDate = resumoStartDateInput.value ? new Date(resumoStartDateInput.value) : null;
    const resumoEndDate = resumoEndDateInput.value ? new Date(resumoEndDateInput.value) : null;

    const resumoStatusCheckboxes = document.querySelectorAll('.summary-status-checkbox');
    const selectedResumoStatuses = Array.from(resumoStatusCheckboxes)
        .filter(checkbox => checkbox.checked)
        .map(checkbox => checkbox.value.toLowerCase());

    const rows = document.querySelectorAll('#chamados-table tbody tr');
    const resumoPorSetor = {};
    const resumoPorFilial = {};
    const resumoPorStatus = {};
    const resumoPorAssunto = {};

    rows.forEach(row => {
        const dateText = row.cells[2].textContent.trim(); // Coluna de data_abertura
        const [day, month, year] = dateText.split('/'); // Supondo formato DD/MM/YYYY
        const rowDate = new Date(`${year}-${month}-${day}`); // Converter para formato YYYY-MM-DD
        const status = row.cells[1].textContent.trim().toLowerCase();
        const setor = row.cells[5].textContent.trim();
        const filial = row.cells[4].textContent.trim();
        const tipo = row.cells[8].textContent.trim();

        console.log({ dateText, rowDate, resumoStartDate, resumoEndDate }); // Log para depuração

        // Verifica se a linha corresponde aos filtros de data e status
        const matchesDate = (!resumoStartDate || rowDate >= resumoStartDate) &&
                            (!resumoEndDate || rowDate <= resumoEndDate);
        const matchesResumoStatus = selectedResumoStatuses.length === 0 || selectedResumoStatuses.includes(status);

        // Aplica os filtros
        if (matchesDate && matchesResumoStatus) {
            if (status) {
                resumoPorStatus[status] = (resumoPorStatus[status] || 0) + 1;
            }
            if (setor) {
                resumoPorSetor[setor] = (resumoPorSetor[setor] || 0) + 1;
            }
            if (filial) {
                resumoPorFilial[filial] = (resumoPorFilial[filial] || 0) + 1;
            }
            if (tipo) {
                resumoPorAssunto[tipo] = (resumoPorAssunto[tipo] || 0) + 1;
            }
        }
    });

    // Atualizar o conteúdo do resumo
    const sortedStatus = Object.entries(resumoPorStatus).sort((a, b) => b[1] - a[1]);
    const sortedSetor = Object.entries(resumoPorSetor).sort((a, b) => b[1] - a[1]);
    const sortedFilial = Object.entries(resumoPorFilial).sort((a, b) => b[1] - a[1]);
    const sortedAssunto = Object.entries(resumoPorAssunto).sort((a, b) => b[1] - a[1]);

    let resumoContent = "<div class='resumo-column'><h3>Resumo por Status</h3><ul>";
    sortedStatus.forEach(([status, count]) => {
        resumoContent += `<li>${status}: ${count}</li>`;
    });
    resumoContent += "</ul></div><div class='resumo-column'><h3>Resumo por Setor</h3><ul>";
    sortedSetor.forEach(([setor, count]) => {
        resumoContent += `<li>${setor}: ${count}</li>`;
    });
    resumoContent += "</ul></div><div class='resumo-column'><h3>Resumo por Código Filial</h3><ul>";
    sortedFilial.forEach(([filial, count]) => {
        resumoContent += `<li>${filial}: ${count}</li>`;
    });
    resumoContent += "</ul></div><div class='resumo-column'><h3>Resumo por Assunto</h3><ul>";
    sortedAssunto.forEach(([tipo, count]) => {
        resumoContent += `<li>${tipo}: ${count}</li>`;
    });

    resumoContent += "</ul></div>";

    document.getElementById('resumo-content').innerHTML = resumoContent;
    document.getElementById('resumo-modal').style.display = 'block';
};

// Adicionar eventos para os filtros do resumo
document.getElementById('resumo-filter-button').addEventListener('click', applyResumoFilters);

const resumoStatusCheckboxes = document.querySelectorAll('.summary-status-checkbox');
resumoStatusCheckboxes.forEach(checkbox => {
    checkbox.addEventListener('change', applyResumoFilters);
});