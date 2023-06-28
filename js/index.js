const invoisysApi = {
  'base': 'https://api.invoisys.com.br/api',
  'envioxmlcontingencia': 'nfce/envioxmlcontingencia',
  'consultachavedeacesso': 'nfce/getbychavedeacesso'
}

const invoisysConfig = { 'env': 1 };
var loadedXmlsArr = [];

const changeLoadingAnimationText = (text) => $('#load-ani > .text-center').text(text);
const clearTableBody = () => $('#table > tbody').empty();
const appendXmlErrorMessageAlertList = (errorMessage) => $('#xmls-error-alert > ul').append(`<li>${errorMessage}</li>`);
const showXmlErrorMessageAlertList = () => $('#xmls-error-alert').show();

const clearXmlErrorMessageAlertList = () => {
  $('#xmls-error-alert').hide();
  $('#xmls-error-alert > ul').empty();
}

const setProgressBarPercentage = (length) => {
  const value = parseInt($('.progress-bar').attr('aria-valuenow'));
  const percentage = (((value) / length) * 100).toFixed(0);

  $('.progress-bar').attr('aria-valuenow', (value + 1));
  $('.progress-bar').css('width', `${percentage}%`);
  $('.progress-bar').html(`${percentage}%`);
}

const clearProgressBar = () => {
  $('.progress-bar').attr('aria-valuenow', 1);
  $('.progress-bar').css('width', '0%');
  $('.progress-bar').html('0%');
}

const showLoadingAnimation = () => {
  $('#load-ani').show();
  clearProgressBar();
};

const hideLoadingAnimation = () => {
  $('#load-ani').hide();
  clearProgressBar();
}

const clearInputFile = () => {
  loadedXmlsArr.length = 0;
  $('#xmls-file-input').val('');
  $('#xmls-file-input-label').html('Selecionar arquivo para envio');
}

const createTableRow = (accessKey, status, issueDate, authDate) => {
  $('#table > tbody').append(`
    <tr>
      <td>${accessKey}</td>
      <td>${status}</td>
      <td>${issueDate}</td>
      <td>${authDate}</td>
    </tr>
  `);
}

const showRandomFact = () => {
  try {
    fetch('https://catfact.ninja/fact').then(response => {
      if (response.ok) {
        response.json().then(json => {
          $('#random-fact').text(json.fact);
        });
      }
    });
  } catch (error) { }
};

const incrementVisitsCounter = () => {
  try {
    fetch('https://api.api-ninjas.com/v1/counter?id=vistainvoisyshelper&hit=true', {
      headers: { 'X-Api-Key': 'PcT918R7y671w1GT54dl5g==XFIURMa1OU5LvxgX' }
    }).then(response => {
      if (response.ok) {
        response.json().then(json => {
          console.log(`number of visits: ${json.value}`);
        });
      }
    });
  } catch (error) { }
}

const getAllAccessKeyData = (accessKeyGetArr, apiToken) => {
  const length = accessKeyGetArr.length;

  const response = Promise.all(
    accessKeyGetArr.map((data) => fetch(data.url, {
      method: 'GET',
      headers: {
        'content-type': 'application/json',
        'authorization': `bearer ${apiToken}`
      },
    })
      .then(async response => {
        return {
          accessKey: data.accessKey,
          response: await response.json(),
        }
      })
      .catch(error => {
        console.error(error);
        return {
          accessKey: data.accessKey,
          response: null
        }
      })
      .finally(() => {
        setProgressBarPercentage(length);
      })
    )
  );

  return response;
};

$('#consult-access-key-btn').on('click', async (event) => {
  event.stopPropagation();

  const apiToken = $('#api-token').val();
  if (apiToken == '') {
    window.alert('Invoisys API Token vazio.');
    return null;
  }

  const inputTokens = $('#tokenfield').tokenfield('getTokens');
  if (!inputTokens.length) {
    window.alert('Nenhuma chave de acesso inserida.');
    return null;
  }

  clearXmlErrorMessageAlertList();
  clearTableBody();
  changeLoadingAnimationText('Carregando...');
  showLoadingAnimation();

  const accessKeyGetArr = [];
  inputTokens.forEach(token => {
    const accessKey = token.value.replace(/[^\w\s]/gi, '');
    const url = `${invoisysApi.base}/${invoisysApi.consultachavedeacesso}/${accessKey}`;
    accessKeyGetArr.push({
      url: url,
      accessKey
    });
  });

  let errorAccessKey = [];
  const accessKeyData = await getAllAccessKeyData(accessKeyGetArr, apiToken);
  accessKeyData.forEach(data => {
    if (data.response) {
      const accessKey = data.response.chaveDeAcesso || '';
      const status = data.response.status.value || '';
      const issueDate = data.response.dataHoraEmissao || '';
      const authDate = data.response.dataDeAutorizacao || '';

      createTableRow(accessKey, status, issueDate, authDate);
    }
    else {
      errorAccessKey.push(data.accessKey);
    }
  });

  changeLoadingAnimationText('Concluído');

  if (errorAccessKey.length) {
    window.alert(`Chaves de acesso não encontradas:\n${errorAccessKey}`);
  }
});

const sendContigencyXmlsData = (postArray, apiToken) => {
  const length = loadedXmlsArr.length;
  const url = `${invoisysApi.base}/${invoisysApi.envioxmlcontingencia}`;

  const response = Promise.all(
    postArray.map((postData, index) => fetch(url, {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        'authorization': `bearer ${apiToken}`
      },
      body: JSON.stringify(postData)
    })
      .then(async response => {
        if (response.ok) {
          const json = await response.json();
          return { response: json, errorMessage: null }
        } else {
          if (response.status != 404) {
            const json = await response.json();
            const exception = json.hasOwnProperty('excecao') ? json.excecao : '';
            const errorMessage = `XML [${index}] response NOT OK: [${response.status}](${response.statusText}) ${exception}`

            console.error(errorMessage);
            return { response: null, errorMessage };
          }
        }
      })
      .catch(error => {
        const errorMessage = `XML [${index}] Exception: ${error}`;
        console.error(errorMessage);
        return { response: null, errorMessage };
      })
      .finally(() => {
        setProgressBarPercentage(length);
      })
    )
  );

  return response;
};

$('#xmls-file-input').on('change', (event) => {
  try {
    const files = event.target.files;
    $('#xmls-file-input-label').html(`${files[0].name}`);

    let reader = new FileReader();
    reader.readAsText(files[0], "UTF-8");
    reader.onload = function (event) {
      const rawText = event.target.result.replace(/(\r\n|\n|\r)/gm, '');
      loadedXmlsArr = rawText.split('@@').filter(xml => (xml && xml.substring(0, 2) !== "##"));

      window.alert(`${loadedXmlsArr.length} xml(s) carregado(s) para envio.`);
    }
  } catch (error) {
    window.alert('Erro ao carregar o arquivo selecionado. Consulte o log do navegador para maiores detalhes.');
    console.error(error);
  }

  /**
   * TODO: Implementar configurações para XML..
   */
  /* 
  const options = {
    ignoreAttributes: false,
    numberParseOptions: {
      leadingZeros: true
    }
  };

  const parser = new XMLParser(options);
  const builder = new XMLBuilder(options);
  */
});

$('#send-xml-btn').on('click', async (event) => {
  event.stopPropagation();

  const apiToken = $('#api-token').val();
  if (apiToken == '') {
    window.alert('Invoisys API Token vazio.');
    return null;
  }

  if (loadedXmlsArr.length == 0) {
    window.alert('Nenhum XML carregado para envio.');
    return null;
  }

  clearXmlErrorMessageAlertList();
  clearTableBody();
  changeLoadingAnimationText('Carregando...');
  showLoadingAnimation();

  let postArray = [];
  loadedXmlsArr.forEach(xml => {
    postArray.push({
      'ambiente': invoisysConfig.env,
      'xml': xml
    });
  });

  let hasXmlErrors = false;
  const xmlsResponseData = await sendContigencyXmlsData(postArray, apiToken);
  xmlsResponseData.forEach(data => {
    if (data.response) {
      const accessKey = data.response.dadosDoDocumento.chaveDeAcesso || '';
      const status = data.response.dadosDoDocumento.status.value || '';
      const issueDate = data.response.dadosDoDocumento.dataHoraEmissao || '';
      const authDate = data.response.dadosDoDocumento.dataDeAutorizacao || '';

      createTableRow(accessKey, status, issueDate, authDate);
    }
    else {
      hasXmlErrors = true;
      appendXmlErrorMessageAlertList(data.errorMessage);
    }
  });

  changeLoadingAnimationText('Concluído');
  clearInputFile();

  if (hasXmlErrors) {
    showXmlErrorMessageAlertList();
  }
});

$('document').ready(async () => {
  $('#tokenfield').tokenfield({});
  showRandomFact();
  incrementVisitsCounter();
});