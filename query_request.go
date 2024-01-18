package main

import (
	"bytes"
	"encoding/xml"
	"errors"
	"fmt"
	"io"
	"log"
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
		e = errors.New(strings.Join(errs, ", "))
	}

	return qr, e
}

func processQuery(w http.ResponseWriter, r *http.Request) {
	defer r.Body.Close()

	start := time.Now()
	r.ParseForm()
	fmt.Println(r.Form)

	data, err := validateQueryRequest(r.Form)
	if err != nil {
		errMsg := fmt.Sprintf("Invalid request values: %s", err)
		log.Println(errMsg)
		errorResponse(w, errMsg, 422)
		return
	}

	fmt.Println(data)
	respBody := getResponseBody(data)
	resp, err := http.Post("https://us1.eam.hxgnsmartcloud.com/axis/services/EWSConnector", "text/xml", bytes.NewBuffer([]byte(respBody)))
	diff := time.Since(start)
	fmt.Printf("Request time: %dms\n", diff.Milliseconds())

	defer resp.Body.Close()
	if err != nil {
		http.Error(w, err.Error(), http.StatusBadRequest)
		return
	}

	d := xml.NewDecoder(resp.Body)

	// var responseData [][]string
	var responseError error

	start = time.Now()
	w.Write([]byte(`<table class="data-table"><thead>`))
	for {
		tok, err := d.Token()
		if tok == nil || err == io.EOF {
			break
		} else if err != nil {
			return
		}

		switch ty := tok.(type) {
		case xml.StartElement:
			switch ty.Name.Local {
			case "Metadata":
				var metadata struct {
					Columns []struct {
						Label string `xml:"label,attr"`
					} `xml:"Column"`
				}

				if err = d.DecodeElement(&metadata, &ty); err != nil {
					return
				}

				w.Write([]byte("<tr>"))
				for _, col := range metadata.Columns {

					w.Write([]byte(fmt.Sprintf("<th><span>%s</span></th>", col.Label)))
				}
				w.Write([]byte("</tr>"))
				w.Write([]byte("</thead><tbody>"))
			case "R":
				var row struct {
					C []string
				}

				if err = d.DecodeElement(&row, &ty); err != nil {
					return
				}

				w.Write([]byte("<tr>"))
				for _, col := range row.C {
					w.Write([]byte(fmt.Sprintf("<td>%s</td>", col)))
				}
				w.Write([]byte("</tr>"))
			case "faultstring":
				var fault string
				if err = d.DecodeElement(&fault, &ty); err != nil {
					return
				}

				responseError = errors.New(fault)
				http.Error(w, responseError.Error(), http.StatusBadRequest)
				break
			}
		}
	}
	w.Write([]byte("</tbody></table>"))

	diff = time.Since(start)
	fmt.Printf("Response Template Parse Time: %dms\n", diff.Milliseconds())

	defer func() {
		if err != nil {
			fmt.Printf("Error decoding element: %v", err)
			http.Error(w, err.Error(), http.StatusInternalServerError)
		}
	}()

	// diff = time.Since(start)
	// fmt.Printf("Parse time: %dms\n", diff.Milliseconds())

	// if responseError != nil {
	// 	fmt.Printf("Response Error: %s", responseError)
	// 	http.Error(w, responseError.Error(), http.StatusInternalServerError)
	// 	return
	// }

	// start = time.Now()
	// w.WriteHeader(http.StatusOK)
	// t, _ := template.ParseFiles("views/query_data.html")
	// if err = t.Execute(w, responseData); err != nil {
	// 	fmt.Printf("Error decoding element: %s", err)
	// 	http.Error(w, err.Error(), http.StatusInternalServerError)
	// 	return
	// }

}

func getResponseBody(data queryRequest) string {
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
