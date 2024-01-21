package main

import (
	"bytes"
	"encoding/xml"
	"errors"
	"fmt"
	"io"
	"net/http"
	"net/url"

	// "slices"
	"strings"
	"time"
)

type queryRequest struct {
	Username string
	Password string
	Tenant   string
	Sample   bool
	Query    string
}

const hexagonUrl = "https://us1.eam.hxgnsmartcloud.com/axis/services/EWSConnector"

func processQuery(w http.ResponseWriter, r *http.Request) {
	defer r.Body.Close()
	r.ParseForm()

	start := time.Now()
	respBody, err := getRequestBody(r.Form)
	if err != nil {
		errorResponse(w, err.Error(), 400)
		return
	}

	resp, err := http.Post(hexagonUrl, "text/xml", bytes.NewBuffer([]byte(respBody)))
	fmt.Printf("Request time: %dms\n", time.Since(start).Milliseconds())
	defer resp.Body.Close()

	if err != nil {
		errorResponse(w, err.Error(), 500)
		return
	}

	d := xml.NewDecoder(resp.Body)
	start = time.Now()

	for {
		tok, err := d.RawToken()
		if tok == nil || err == io.EOF {
			w.Write([]byte("<span>done</span>"))
			break
		} else if err != nil {
			errorResponse(w, err.Error(), 500)
			break
		}
	}
	// w.Write([]byte(`<table class="data-table"><thead>`))
	// for {
	// 	tok, err := d.Token()
	// 	if tok == nil || err == io.EOF {
	// 		break
	// 	} else if err != nil {
	// 		errorResponse(w, err.Error(), 500)
	// 		return
	// 	}

	// 	switch ty := tok.(type) {
	// 	case xml.StartElement:
	// 		switch ty.Name.Local {
	// 		case "C":
	// 			ctok, _ := d.Token()
	// 			if cdata, ok := ctok.(xml.CharData); ok {
	// 				w.Write([]byte("<td>"))
	// 				w.Write(cdata)
	// 				w.Write([]byte("</td>"))
	// 			}
	// 		case "Column":
	// 			i := slices.IndexFunc(ty.Attr, func(attr xml.Attr) bool { return attr.Name.Local == "label" })
	// 			w.Write([]byte("<th><span>" + ty.Attr[i].Value + "</span></th>"))
	// 		case "R", "Metadata":
	// 			w.Write([]byte("<tr>"))
	// 		case "Data":
	// 			w.Write([]byte("</thead><tbody>"))
	// 		case "faultstring":
	// 			ftok, _ := d.Token()
	// 			errorResponse(w, string(ftok.(xml.CharData)), 400)
	// 			return
	// 		}
	// 	case xml.EndElement:
	// 		switch ty.Name.Local {
	// 		case "R", "Metadata":
	// 			w.Write([]byte("</tr>"))
	// 		case "Data":
	// 			w.Write([]byte("</tbody></table>"))
	// 		}
	// 	}
	// }
	fmt.Printf("Parse Time: %dms\n", time.Since(start).Milliseconds())
}

func getRequestBody(formData url.Values) (string, error) {
	var data queryRequest
	if err := validateQueryRequest(formData, &data); err != nil {
		return "", err
	}

	query := strings.Replace(data.Query, "<", "&lt;", -1)

	if data.Sample {
		query = fmt.Sprintf("SELECT * FROM (%s) WHERE ROWNUM &lt;= 50", query)
	}

	return fmt.Sprintf(`<Envelope xmlns="http://schemas.xmlsoap.org/soap/envelope/" xmlns:xsd="http://www.w3.org/2001/XMLSchema" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance">
	<Header>
		<Security xmlns="http://schemas.xmlsoap.org/ws/2002/04/secext">
			<UsernameToken>
				<Username>%s@%s</Username>
				<Password>%s</Password>
			</UsernameToken>
		</Security>
		<SessionScenario xmlns="http://schemas.datastream.net/headers">terminate</SessionScenario>
		<Organization xmlns="http://schemas.datastream.net/headers">GSO</Organization>
	</Header>
	<Body>
		<MP0170_GetDatabaseData_001 verb="Get" noun="DatabaseData" version="001" xmlns="http://schemas.datastream.net/MP_functions/MP0170_001">
			<SelectStatement returnmetadata="true">
				%s
			</SelectStatement>
		</MP0170_GetDatabaseData_001>
	</Body>
</Envelope>`, data.Username, data.Tenant, data.Password, query), nil
}

func validateQueryRequest(values url.Values, qr *queryRequest) error {
	var errs []string

	for k, v := range values {
		if len(v) == 0 {
			errs = append(errs, k)
		}
	}

	if len(errs) > 0 {
		return errors.New(fmt.Sprintf("Missing request values: [%s]", strings.Join(errs, ", ")))
	}

	qr.Username = values.Get("username")
	qr.Password = values.Get("password")
	qr.Tenant = values.Get("tenant")
	qr.Sample = values.Get("sample") == "true"
	qr.Query = values.Get("query")

	return nil
}
