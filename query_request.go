package main

import (
	"bytes"
	"encoding/xml"
	"errors"
	"fmt"
	"io"
	"net/http"
	"net/url"
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

type metadataElement struct {
	Columns []struct {
		Label string `xml:"label,attr"`
	} `xml:"Column"`
}

type R struct {
	C []string
}

const hexagonUrl = "https://us1.eam.hxgnsmartcloud.com/axis/services/EWSConnector"

func processQuery(w http.ResponseWriter, r *http.Request) {
	defer r.Body.Close()

	r.ParseForm()
	data, err := validateQueryRequest(r.Form)

	if err != nil {
		errorResponse(w, err.Error(), 400)
		return
	}

	start := time.Now()
	respBody := getRequestBody(data)
	resp, err := http.Post(hexagonUrl, "text/xml", bytes.NewBuffer([]byte(respBody)))
	fmt.Printf("Request time: %dms\n", time.Since(start).Milliseconds())
	defer resp.Body.Close()

	if err != nil {
		errorResponse(w, err.Error(), 500)
		return
	}

	d := xml.NewDecoder(resp.Body)
	start = time.Now()

	w.Write([]byte(`<table class="data-table"><thead>`))
	for {
		tok, err := d.Token()
		if tok == nil || err == io.EOF {
			return
		} else if err != nil {
			break
		}

		switch ty := tok.(type) {
		case xml.StartElement:
			switch ty.Name.Local {
			case "R", "Metadata":
				w.Write([]byte("<tr>"))
			case "C":
				cdata, _ := d.Token()
				w.Write([]byte(fmt.Sprintf("<td>%s</td>", string(cdata.(xml.CharData)))))
			case "Data":
				w.Write([]byte("</thead><tbody>"))
			case "faultstring":
				cdata, _ := d.Token()
				responseError := errors.New(string(cdata.(xml.CharData)))
				errorResponse(w, responseError.Error(), 400)
			}
		case xml.Attr:
			if ty.Name.Local == "Label" {
				w.Write([]byte(fmt.Sprintf("<th><span>%s</span></th>", ty.Value)))
			}
		case xml.EndElement:
			switch ty.Name.Local {
			case "R", "Metadata":
				w.Write([]byte("</tr>"))
			case "Data":
				w.Write([]byte("</tbody></table>"))
			}
		}
	}
	fmt.Printf("Parse Time: %dms\n", time.Since(start).Milliseconds())
	errorResponse(w, err.Error(), 500)
}

func validateQueryRequest(values url.Values) (qr queryRequest, e error) {
	var errs []string

	if qr.Username = values.Get("username"); qr.Username == "" {
		errs = append(errs, "username")
	}

	if qr.Password = values.Get("password"); qr.Password == "" {
		errs = append(errs, "password")
	}

	if qr.Tenant = values.Get("tenant"); qr.Tenant == "" {
		errs = append(errs, "tenant")
	}

	if sample := values.Get("sample"); sample != "" {
		qr.Sample = sample == "true"
	} else {
		errs = append(errs, "sample")
	}

	if qr.Query = values.Get("query"); qr.Query == "" {
		errs = append(errs, "query")
	}

	if len(errs) > 0 {
		e = errors.New(fmt.Sprintf("Invalid request values: %s", strings.Join(errs, ", ")))
	}

	return qr, e
}

func getRequestBody(data queryRequest) string {
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
</Envelope>`, data.Username, data.Tenant, data.Password, query)
}
