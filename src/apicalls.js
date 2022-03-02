import fetch from 'node-fetch';
import {FormData} from "formdata-node"

export const apiCalls = async function (id) {
  try {
    // Get a token for Accela
    console.log(id);
    const accelaToken = await getToken()

    // Pass these from Jeff's code
    const recordID = "SOUTHBENDIN-REC22-00000-0000Q";
    const workOrderID = id;

    // Cityworks: 
    //   - Get a token for Cityworks
    //   - Get work order status
    const TokenResponse = await fetch("https://bigateway.southbendin.gov/mowing/Services/General/Authentication/Authenticate?data={'LoginName':'streetsadmin','Password':'Password1!'}");
    const content = await TokenResponse.json()
    const cityworksToken = content.Value.Token;
      
    const WOResponse = await fetch("https://bigateway.southbendin.gov/mowing/services/Ams/WorkOrder/ById?data={'WorkOrderId':" + workOrderID + "}&token=" + cityworksToken);
    const worder = await WOResponse.json();
    const status = worder.Value.Status;  
    // console.log("Work Order:", worder);
    // console.log("Status:", status);

    // Get attachments from the Cityworks work order
    const AtthResponse = await fetch("https://bigateway.southbendin.gov/mowing/services/Ams/Attachments/WorkOrderAttachments?data={'WorkOrderIds': ['" + workOrderID + "'],'WorkOrderSids': [" + workOrderID + "]}&token=" + cityworksToken);
    const attachments = await AtthResponse.json();
    let atthNo = attachments.Value.length
    for (let atth of attachments.Value) {
      // Starts from the latest attachment
      let atthId = atth.Id;
      // Name the attachments
      const atthName = "Cityworks_" + atthNo.toLocaleString('en-US', {minimumIntegerDigits: 2, useGrouping:false}) + ".png";
      const DownAtthResponse = await fetch("https://bigateway.southbendin.gov/mowing/services/Ams/Attachments/DownloadWorkOrderAttachment?data={'AttachmentId':" + atthId + "}&token=" + cityworksToken);
      var blobImg = await DownAtthResponse.blob();
      // Send attached images to the Accela record
      sendAttachment(blobImg, atthName, recordID, accelaToken);
      atthNo -= 1   
    }
    
    // Update Follow-Up Inspection to Send to Crew => Automatically creates Abatement Inspection
    var followUpID = await findInspection(recordID, "Follow-Up Inspection", accelaToken)
    console.log(followUpID)
    await resultInspection(followUpID, "Send to Crew", accelaToken)

    // Update Abatement Inspection to Abatement Complete
    var abatementID = await findInspection(recordID, "Abatement", accelaToken)
    console.log(abatementID)
    await resultInspection(abatementID, "Abatement Complete", accelaToken)

  } catch (err) {
    console.error(err);
  }
}

// A function to get a token for Accela API
async function getToken() {
  const config = {
        method: 'POST',
        headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
            'x-accela-appid': '637539356259447228'
        },
        body: new URLSearchParams({       
          'client_id':'637539356259447228',
          'client_secret':'7b64214d08e14909b1ca7719868a483d',
          'grant_type': 'password',
          'username':'admin',        
          'password':'$0Uthbend',
          'scope':'records inspections documents',
          'agency_name':'southbendin',
          'environment':'SUPP'
    })
  };
  try {
      const GetTokenResponse = await fetch('https://auth.accela.com/oauth2/token', config);
      const data = await GetTokenResponse.json();
      const accela_token = data.access_token
      return accela_token;
      
  } catch (e) {
      return e;
  }
};

// A function to send attachments to a record in Accela
async function sendAttachment(Img, atthName, recordID, token) {
      const formData = new FormData();
      formData.append("uploadedFile", Img, atthName)
      formData.append("fileInfo", JSON.stringify(
        [
          {
            "serviceProviderCode": "SOUTHBENDIN",
            "fileName": atthName,
            "type": "image/png",
            "description": ""
          }
        ]
      ))     
      const config = {
        method: 'POST',
        headers: {
            'Authorization': token,
            'Content-Type': 'multipart/form-data'
        }, 
        body: formData
      };
      try {
          const SendResponse = await fetch('https://apis.accela.com/v4/records/' + recordID + '/documents', config)
          const res = await SendResponse.json();
          return res;
      }
      catch (e) {
          return e;
      }    
};

// A function to find inspection id of a given type of inspection in Accela
async function findInspection(recordID, value, token) {
  const config = {
    method: 'GET',
    headers: {
        'Authorization': token
    }
  }
  try {
    const findInsResponse = await fetch("https://apis.accela.com/v4/records/" + recordID + "/inspections", config);
    const content = await findInsResponse.json()
    for (let insp of content.result) {
      const inspType = insp.type.value
      if (inspType == value){
        let inspID = insp.id
        return inspID
      }
    }
    console.log("Inspection type cannot be found.")
  }
  catch (err) {
  console.error(err);
  }
};

// A function to result an inspection in Accela
async function resultInspection(inspID, value, token) {
  const config = {
    method: 'PUT',
    headers: {
        'Authorization': token,
        'Content-Type': 'text/plain'
    },
    body: JSON.stringify({
      "status": {
          "text": value,
          "value": value
      }
    }) 
  };
  try {
    const rsltInspResponse = await fetch("https://apis.accela.com/v4/inspections/" + inspID + "/result", config);
    const res = await rsltInspResponse.json();
    return res;
  } 
  catch (e) {
      return e;
    } 
};






